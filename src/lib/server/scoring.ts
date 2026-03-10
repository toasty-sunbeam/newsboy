// Article scoring based on user preferences
// Called during nightly batch after fetching feeds, before creating daily slots

import { prisma } from './db';

interface Preferences {
	interests: Record<string, number>; // e.g. {"robotics": 0.8, "politics": 0.2}
	sourceWeights: Record<string, number>; // per-source boost/suppress, keyed by source ID
	moodBalance: number; // -1 (serious) to +1 (uplifting)
	preferLongForm: boolean;
	preferVisual: boolean;
}

interface ArticleForScoring {
	id: string;
	title: string;
	excerpt: string | null;
	sourceId: string;
	publishedAt: Date | null;
	fetchedAt: Date;
	heroImageUrl: string | null;
	readingTimeMinutes: number | null;
	contentType: string;
	source: {
		id: string;
		category: string;
		name: string;
	};
}

/**
 * Score all recent unscored articles based on user preferences.
 * Updates relevanceScore in the database so slot creation picks the best ones.
 */
export async function scoreArticles() {
	console.log('\n📊 Scoring articles based on preferences...');

	// Load preferences
	const rawPrefs = await prisma.userPreferences.findUnique({
		where: { id: 'default' }
	});

	if (!rawPrefs) {
		console.log('   ⚠️  No preferences found, skipping scoring');
		return;
	}

	const prefs: Preferences = {
		interests: JSON.parse(rawPrefs.interests),
		sourceWeights: JSON.parse(rawPrefs.sourceWeights),
		moodBalance: rawPrefs.moodBalance,
		preferLongForm: rawPrefs.preferLongForm,
		preferVisual: rawPrefs.preferVisual
	};

	// Get recent articles (last 7 days) with their sources
	const sevenDaysAgo = new Date();
	sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

	const articles = await prisma.article.findMany({
		where: {
			fetchedAt: { gte: sevenDaysAgo }
		},
		include: {
			source: {
				select: { id: true, category: true, name: true }
			}
		}
	});

	if (articles.length === 0) {
		console.log('   ℹ️  No recent articles to score');
		return;
	}

	console.log(`   Scoring ${articles.length} articles...`);

	const hasInterests = Object.keys(prefs.interests).length > 0;
	const hasSourceWeights = Object.keys(prefs.sourceWeights).length > 0;

	// Score each article
	let updated = 0;
	for (const article of articles) {
		const score = calculateScore(article, prefs, hasInterests, hasSourceWeights);

		await prisma.article.update({
			where: { id: article.id },
			data: { relevanceScore: score }
		});
		updated++;
	}

	console.log(`   ✅ Scored ${updated} articles`);
}

/**
 * Calculate a relevance score for a single article.
 * Returns a score where higher = more relevant to user preferences.
 *
 * Scoring factors:
 *   - Topic relevance: keyword matching against interests (0-1, weight: 40%)
 *   - Source weight: per-source boost/suppress (-1 to 1, weight: 20%)
 *   - Recency: newer articles score higher (0-1, weight: 25%)
 *   - Format bonus: image presence + reading time preferences (0-1, weight: 15%)
 */
function calculateScore(
	article: ArticleForScoring,
	prefs: Preferences,
	hasInterests: boolean,
	hasSourceWeights: boolean
): number {
	let score = 0;

	// --- Topic relevance (0 to 1, weight: 40%) ---
	if (hasInterests) {
		const topicScore = calculateTopicRelevance(article, prefs.interests);
		score += topicScore * 0.4;
	} else {
		// No interests set — give everyone a baseline so other factors differentiate
		score += 0.5 * 0.4;
	}

	// --- Source weight (weight: 20%) ---
	if (hasSourceWeights) {
		// sourceWeights values are -1 (suppress) to +1 (boost)
		const sourceWeight = prefs.sourceWeights[article.sourceId] ?? 0;
		// Map -1..1 to 0..1
		score += ((sourceWeight + 1) / 2) * 0.2;
	} else {
		score += 0.5 * 0.2;
	}

	// --- Recency (0 to 1, weight: 25%) ---
	const recencyScore = calculateRecency(article.publishedAt ?? article.fetchedAt);
	score += recencyScore * 0.25;

	// --- Format bonus (0 to 1, weight: 15%) ---
	const formatScore = calculateFormatScore(article, prefs);
	score += formatScore * 0.15;

	return score;
}

/**
 * Match article title + excerpt against interest keywords.
 * Returns 0-1 where 1 means strong match to high-weight interests.
 */
function calculateTopicRelevance(
	article: ArticleForScoring,
	interests: Record<string, number>
): number {
	const searchText = `${article.title} ${article.excerpt ?? ''} ${article.source.category}`.toLowerCase();

	let totalWeight = 0;
	let matchedWeight = 0;

	for (const [topic, weight] of Object.entries(interests)) {
		totalWeight += Math.abs(weight);

		// Split multi-word topics into individual terms for flexible matching
		const terms = topic.toLowerCase().split(/\s+/);
		const matched = terms.every((term) => searchText.includes(term));

		if (matched) {
			matchedWeight += weight;
		}
	}

	if (totalWeight === 0) return 0.5;

	// Normalize: matchedWeight / totalWeight gives -1 to 1, map to 0 to 1
	return Math.max(0, Math.min(1, (matchedWeight / totalWeight + 1) / 2));
}

/**
 * Score recency on an exponential decay curve.
 * Articles from today score ~1.0, articles from 7 days ago score ~0.1.
 */
function calculateRecency(date: Date): number {
	const now = new Date();
	const ageHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);
	// Decay: half-life of ~24 hours
	return Math.exp(-0.03 * ageHours);
}

/**
 * Score based on format preferences (visual content, reading time).
 */
function calculateFormatScore(article: ArticleForScoring, prefs: Preferences): number {
	let score = 0.5; // neutral baseline

	// Visual preference: boost articles with images if user prefers visual
	if (prefs.preferVisual && article.heroImageUrl) {
		score += 0.25;
	}
	if (!prefs.preferVisual && !article.heroImageUrl) {
		score += 0.1; // slight boost for text-only when user prefers text
	}

	// Long-form preference
	if (article.readingTimeMinutes) {
		const isLong = article.readingTimeMinutes > 5;
		if (prefs.preferLongForm && isLong) {
			score += 0.25;
		} else if (!prefs.preferLongForm && !isLong) {
			score += 0.15;
		}
	}

	return Math.min(1, score);
}
