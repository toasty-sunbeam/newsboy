// Nightly batch job: RSS fetching, article storage, scoring, and briefing generation
// Run with: bun run batch

import { prisma } from './db';
import { fetchAndParseFeed, type FeedItem } from './rss';
import { generateCrayonDrawing } from './replicate';
import { generateDailyBriefing } from './claude';
import { env } from '$env/dynamic/private';

// Drip configuration
const INITIAL_ARTICLES = 0; // Articles available at midnight (hour 0)
const ARTICLES_PER_HOUR = 2; // Articles revealed each hour starting at 1 AM
const MAX_DAILY_ARTICLES = 48; // Maximum articles per day

// Crayon generation configuration
const CRAYON_DELAY_MS = 2000; // Delay between image generation requests to avoid rate limiting

/**
 * Sleep for a specified number of milliseconds
 */
function sleep(ms: number): Promise<void> {
	return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Main batch job entry point
 */
async function main() {
	console.log('=== Newsboy Batch Job Started ===');
	console.log(`Time: ${new Date().toISOString()}`);

	try {
		await fetchAllFeeds();
		await createDailySlotsForTomorrow();
		await generateCrayonDrawingsForTomorrow();
		await generateBriefingForTomorrow();
		console.log('\n=== Batch Job Completed Successfully ===');
	} catch (error) {
		console.error('\n=== Batch Job Failed ===');
		console.error(error);
		process.exit(1);
	}
}

/**
 * Fetch all enabled RSS feeds and store new articles
 */
async function fetchAllFeeds() {
	// Get all enabled sources
	const sources = await prisma.source.findMany({
		where: { enabled: true },
		orderBy: { name: 'asc' }
	});

	console.log(`\nFound ${sources.length} enabled sources`);

	let totalNew = 0;
	let totalSkipped = 0;
	let totalErrors = 0;

	// Process each source
	for (const source of sources) {
		try {
			console.log(`\n📰 Fetching: ${source.name}`);
			console.log(`   URL: ${source.feedUrl}`);

			const feed = await fetchAndParseFeed(source.feedUrl);
			console.log(`   Found ${feed.items.length} items in feed`);

			// Update source name and siteUrl if we got them from the feed
			if (feed.feedTitle && feed.feedTitle !== source.name) {
				await prisma.source.update({
					where: { id: source.id },
					data: {
						name: feed.feedTitle,
						siteUrl: feed.siteUrl || source.siteUrl
					}
				});
			}

			// Store each article
			let newCount = 0;
			let skippedCount = 0;

			for (const item of feed.items) {
				const stored = await storeArticle(source.id, source.contentType, item);
				if (stored) {
					newCount++;
				} else {
					skippedCount++;
				}
			}

			console.log(`   ✅ ${newCount} new articles, ${skippedCount} already exist`);
			totalNew += newCount;
			totalSkipped += skippedCount;

		} catch (error) {
			console.error(`   ❌ Error fetching ${source.name}:`, error instanceof Error ? error.message : error);
			totalErrors++;
		}
	}

	console.log('\n--- Summary ---');
	console.log(`New articles: ${totalNew}`);
	console.log(`Skipped (duplicates): ${totalSkipped}`);
	console.log(`Errors: ${totalErrors}`);
}

/**
 * Store an article in the database (skip if URL already exists)
 */
async function storeArticle(
	sourceId: string,
	sourceContentType: string,
	item: FeedItem
): Promise<boolean> {
	try {
		// Check if article already exists
		const existing = await prisma.article.findUnique({
			where: { url: item.url }
		});

		if (existing) {
			return false; // Already exists, skip
		}

		// Determine content type for this article
		const contentType = sourceContentType === 'mixed' ? 'article' : sourceContentType;

		// Determine display mode based on image dimensions
		let displayMode = 'standard';
		if (item.imageUrl) {
			if (item.imageWidth && item.imageHeight) {
				const ratio = item.imageWidth / item.imageHeight;
				if (ratio > 1.5) {
					displayMode = 'wide';
				} else if (ratio < 0.7) {
					displayMode = 'tall';
				}
			}
			// For webcomics, default to standard (will show large)
			if (contentType === 'webcomic') {
				displayMode = item.imageWidth && item.imageWidth > 800 ? 'wide' : 'standard';
			}
		} else {
			// No image - will need crayon drawing later
			displayMode = 'crayon';
		}

		// Create the article
		await prisma.article.create({
			data: {
				url: item.url,
				title: item.title,
				sourceId,
				publishedAt: item.publishedAt,
				contentType,
				heroImageUrl: item.imageUrl,
				imageWidth: item.imageWidth,
				imageHeight: item.imageHeight,
				displayMode,
				excerpt: item.excerpt,
				relevanceScore: 0 // Will be scored later
			}
		});

		return true; // Successfully stored new article
	} catch (error) {
		console.error(`   ⚠️  Error storing article "${item.title}":`, error instanceof Error ? error.message : error);
		return false;
	}
}

/**
 * Create daily slots for tomorrow's articles
 * Assigns revealHour based on drip schedule:
 * - First 10 articles: revealHour = 0 (available immediately)
 * - Then 2 articles per hour after that
 */
async function createDailySlotsForTomorrow() {
	console.log('\n📅 Creating daily slots for tomorrow...');

	// Calculate tomorrow's date (midnight)
	const tomorrow = new Date();
	tomorrow.setDate(tomorrow.getDate() + 1);
	tomorrow.setHours(0, 0, 0, 0);

	// Check if slots already exist for tomorrow
	const existingSlots = await prisma.dailySlot.count({
		where: { date: tomorrow }
	});

	if (existingSlots > 0) {
		console.log(`   ⚠️  Slots already exist for ${tomorrow.toDateString()} (${existingSlots} slots)`);
		console.log('   Skipping slot creation...');
		return;
	}

	// Get recent articles that haven't been slotted yet, ordered by relevance and recency
	// We look at articles from the past 7 days to ensure we have enough content
	const sevenDaysAgo = new Date();
	sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

	// Get article IDs that are already in slots
	const slottedArticleIds = await prisma.dailySlot.findMany({
		select: { articleId: true }
	});
	const slottedIds = new Set(slottedArticleIds.map((s) => s.articleId));

	// Get candidate articles
	const candidates = await prisma.article.findMany({
		where: {
			fetchedAt: { gte: sevenDaysAgo }
		},
		orderBy: [{ relevanceScore: 'desc' }, { publishedAt: 'desc' }, { fetchedAt: 'desc' }],
		take: MAX_DAILY_ARTICLES * 2 // Get extras in case some are already slotted
	});

	// Filter out already slotted articles
	const availableArticles = candidates.filter((a) => !slottedIds.has(a.id));
	const articlesToSlot = availableArticles.slice(0, MAX_DAILY_ARTICLES);

	if (articlesToSlot.length === 0) {
		console.log('   ⚠️  No new articles available for tomorrow');
		return;
	}

	console.log(`   Found ${articlesToSlot.length} articles to slot`);

	// Create slots with drip schedule
	const slots: { date: Date; articleId: string; revealHour: number; position: number }[] = [];

	articlesToSlot.forEach((article, index) => {
		let revealHour: number;

		if (index < INITIAL_ARTICLES) {
			// First 10 articles available at hour 0
			revealHour = 0;
		} else {
			// Remaining articles: 2 per hour starting at hour 1
			const afterInitial = index - INITIAL_ARTICLES;
			revealHour = Math.floor(afterInitial / ARTICLES_PER_HOUR) + 1;
		}

		slots.push({
			date: tomorrow,
			articleId: article.id,
			revealHour,
			position: index
		});
	});

	// Insert all slots
	await prisma.dailySlot.createMany({
		data: slots
	});

	// Log the distribution
	const hourCounts: Record<number, number> = {};
	slots.forEach((s) => {
		hourCounts[s.revealHour] = (hourCounts[s.revealHour] || 0) + 1;
	});

	console.log('   ✅ Created daily slots with reveal schedule:');
	Object.entries(hourCounts)
		.sort(([a], [b]) => Number(a) - Number(b))
		.forEach(([hour, count]) => {
			const hourLabel = hour === '0' ? 'midnight' : `${hour}:00`;
			console.log(`      ${hourLabel}: ${count} article${count > 1 ? 's' : ''}`);
		});
}

/**
 * Create daily slots for today (for manual/testing use)
 */
async function createDailySlotsForToday() {
	console.log('\n📅 Creating daily slots for today...');

	// Calculate today's date (midnight)
	const today = new Date();
	today.setHours(0, 0, 0, 0);

	// Check if slots already exist for today
	const existingSlots = await prisma.dailySlot.count({
		where: { date: today }
	});

	if (existingSlots > 0) {
		console.log(`   ⚠️  Slots already exist for ${today.toDateString()} (${existingSlots} slots)`);
		console.log('   Skipping slot creation...');
		return;
	}

	// Get article IDs that are already in slots
	const slottedArticleIds = await prisma.dailySlot.findMany({
		select: { articleId: true }
	});
	const slottedIds = new Set(slottedArticleIds.map((s) => s.articleId));

	// Get all articles ordered by relevance and recency
	const candidates = await prisma.article.findMany({
		orderBy: [{ relevanceScore: 'desc' }, { publishedAt: 'desc' }, { fetchedAt: 'desc' }],
		take: MAX_DAILY_ARTICLES * 2
	});

	// Filter out already slotted articles
	const availableArticles = candidates.filter((a) => !slottedIds.has(a.id));
	const articlesToSlot = availableArticles.slice(0, MAX_DAILY_ARTICLES);

	if (articlesToSlot.length === 0) {
		console.log('   ⚠️  No articles available for today');
		return;
	}

	console.log(`   Found ${articlesToSlot.length} articles to slot`);

	// Create slots with drip schedule
	const slots: { date: Date; articleId: string; revealHour: number; position: number }[] = [];

	articlesToSlot.forEach((article, index) => {
		let revealHour: number;

		if (index < INITIAL_ARTICLES) {
			revealHour = 0;
		} else {
			const afterInitial = index - INITIAL_ARTICLES;
			revealHour = Math.floor(afterInitial / ARTICLES_PER_HOUR) + 1;
		}

		slots.push({
			date: today,
			articleId: article.id,
			revealHour,
			position: index
		});
	});

	// Insert all slots
	await prisma.dailySlot.createMany({
		data: slots
	});

	console.log(`   ✅ Created ${slots.length} daily slots for today`);
}

/**
 * Regenerate daily slots for today (clears existing slots first)
 * Unlike createDailySlotsForToday, this allows reusing articles from other days
 */
async function regenerateDailySlotsForToday() {
	console.log('\n🔄 Regenerating daily slots for today...');

	// Calculate today's date (midnight)
	const today = new Date();
	today.setHours(0, 0, 0, 0);

	// Delete existing slots for today
	const deleted = await prisma.dailySlot.deleteMany({
		where: { date: today }
	});

	if (deleted.count > 0) {
		console.log(`   🗑️  Deleted ${deleted.count} existing slots`);
	}

	// Get all articles ordered by relevance and recency
	// For regeneration, we allow reusing articles that may have been slotted for other days
	const candidates = await prisma.article.findMany({
		orderBy: [{ relevanceScore: 'desc' }, { publishedAt: 'desc' }, { fetchedAt: 'desc' }],
		take: MAX_DAILY_ARTICLES
	});

	const articlesToSlot = candidates;

	if (articlesToSlot.length === 0) {
		console.log('   ⚠️  No articles available for today');
		return { deleted: deleted.count, created: 0 };
	}

	console.log(`   Found ${articlesToSlot.length} articles to slot`);

	const slots: { date: Date; articleId: string; revealHour: number; position: number }[] = [];

	articlesToSlot.forEach((article, index) => {
		let revealHour: number;

		if (index < INITIAL_ARTICLES) {
			revealHour = 0;
		} else {
			const afterInitial = index - INITIAL_ARTICLES;
			revealHour = Math.floor(afterInitial / ARTICLES_PER_HOUR) + 1;
		}

		slots.push({
			date: today,
			articleId: article.id,
			revealHour,
			position: index
		});
	});

	await prisma.dailySlot.createMany({
		data: slots
	});

	console.log(`   ✅ Created ${slots.length} new daily slots for today`);
	return { deleted: deleted.count, created: slots.length };
}

/**
 * Generate crayon drawings for articles in tomorrow's slots that need them
 */
async function generateCrayonDrawingsForTomorrow() {
	if (process.env.CRAYON_GENERATION_ENABLED !== 'true') return false;

	console.log('\n🖍️  Generating crayon drawings for image-less articles...');

	// Calculate tomorrow's date (midnight)
	const tomorrow = new Date();
	tomorrow.setDate(tomorrow.getDate() + 1);
	tomorrow.setHours(0, 0, 0, 0);

	// Find all articles in tomorrow's slots that need crayon drawings
	const slotsNeedingCrayons = await prisma.dailySlot.findMany({
		where: { date: tomorrow },
		include: {
			article: {
				select: {
					id: true,
					title: true,
					heroImageUrl: true,
					crayonImageUrl: true,
					displayMode: true
				}
			}
		}
	});

	// Filter to articles without images and without existing crayon drawings
	const articlesNeedingCrayons = slotsNeedingCrayons
		.map((slot) => slot.article)
		.filter((article) => !article.heroImageUrl && !article.crayonImageUrl);

	if (articlesNeedingCrayons.length === 0) {
		console.log('   ℹ️  No articles need crayon drawings');
		return;
	}

	console.log(`   Found ${articlesNeedingCrayons.length} article${articlesNeedingCrayons.length > 1 ? 's' : ''} needing crayon drawings`);
	console.log(`   ⏱️  Processing with ${CRAYON_DELAY_MS}ms delay between requests to avoid rate limiting`);

	let successCount = 0;
	let failureCount = 0;

	// Generate crayon drawing for each article
	for (let i = 0; i < articlesNeedingCrayons.length; i++) {
		const article = articlesNeedingCrayons[i];
		console.log(`\n   📰 [${i + 1}/${articlesNeedingCrayons.length}] "${article.title.substring(0, 60)}${article.title.length > 60 ? '...' : ''}"`);

		const crayonUrl = await generateCrayonDrawing(article.title);

		if (crayonUrl) {
			// Update article with crayon image URL
			await prisma.article.update({
				where: { id: article.id },
				data: {
					crayonImageUrl: crayonUrl,
					displayMode: 'crayon'
				}
			});
			successCount++;
		} else {
			console.log('   ⚠️  Failed to generate crayon drawing, article will display without image');
			failureCount++;
		}

		// Add delay between requests (except after the last one)
		if (i < articlesNeedingCrayons.length - 1) {
			console.log(`   ⏳ Waiting ${CRAYON_DELAY_MS}ms before next request...`);
			await sleep(CRAYON_DELAY_MS);
		}
	}

	console.log(`\n   🎨 Crayon generation complete: ${successCount} succeeded, ${failureCount} failed`);
}

/**
 * Generate crayon drawings for articles in today's slots that need them
 * (for testing/manual use)
 */
async function generateCrayonDrawingsForToday() {
	console.log('\n🖍️  Generating crayon drawings for today\'s image-less articles...');

	const today = new Date();
	today.setHours(0, 0, 0, 0);

	const slotsNeedingCrayons = await prisma.dailySlot.findMany({
		where: { date: today },
		include: {
			article: {
				select: {
					id: true,
					title: true,
					heroImageUrl: true,
					crayonImageUrl: true,
					displayMode: true
				}
			}
		}
	});

	const articlesNeedingCrayons = slotsNeedingCrayons
		.map((slot) => slot.article)
		.filter((article) => !article.heroImageUrl && !article.crayonImageUrl);

	if (articlesNeedingCrayons.length === 0) {
		console.log('   ℹ️  No articles need crayon drawings');
		return 0;
	}

	console.log(`   Found ${articlesNeedingCrayons.length} article${articlesNeedingCrayons.length > 1 ? 's' : ''} needing crayon drawings`);
	console.log(`   ⏱️  Processing with ${CRAYON_DELAY_MS}ms delay between requests to avoid rate limiting`);

	let successCount = 0;

	for (let i = 0; i < articlesNeedingCrayons.length; i++) {
		const article = articlesNeedingCrayons[i];
		console.log(`\n   📰 [${i + 1}/${articlesNeedingCrayons.length}] "${article.title.substring(0, 60)}${article.title.length > 60 ? '...' : ''}"`);

		const crayonUrl = await generateCrayonDrawing(article.title);

		if (crayonUrl) {
			await prisma.article.update({
				where: { id: article.id },
				data: {
					crayonImageUrl: crayonUrl,
					displayMode: 'crayon'
				}
			});
			successCount++;
		}

		// Add delay between requests (except after the last one)
		if (i < articlesNeedingCrayons.length - 1) {
			console.log(`   ⏳ Waiting ${CRAYON_DELAY_MS}ms before next request...`);
			await sleep(CRAYON_DELAY_MS);
		}
	}

	console.log(`\n   🎨 Crayon generation complete: ${successCount} succeeded`);
	return successCount;
}

/**
 * Generate Pip's daily briefing for tomorrow's top articles
 */
async function generateBriefingForTomorrow() {
	console.log('\n📰 Generating Pip\'s daily briefing...');

	// Calculate tomorrow's date (midnight)
	const tomorrow = new Date();
	tomorrow.setDate(tomorrow.getDate() + 1);
	tomorrow.setHours(0, 0, 0, 0);

	// Check if briefing already exists for tomorrow
	const existingBriefing = await prisma.dailyBriefing.findUnique({
		where: { date: tomorrow }
	});

	if (existingBriefing) {
		console.log(`   ℹ️  Briefing already exists for ${tomorrow.toDateString()}`);
		console.log('   Skipping briefing generation...');
		return;
	}

	// Get tomorrow's slots ordered by position to find the top 3 articles
	const tomorrowSlots = await prisma.dailySlot.findMany({
		where: { date: tomorrow },
		include: {
			article: {
				select: {
					id: true,
					title: true,
					excerpt: true,
					url: true
				}
			}
		},
		orderBy: { position: 'asc' },
		take: 3
	});

	if (tomorrowSlots.length === 0) {
		console.log('   ⚠️  No articles found for tomorrow, skipping briefing');
		return;
	}

	console.log(`   Found ${tomorrowSlots.length} article(s) for briefing`);

	// Extract article data for briefing generation
	const articles = tomorrowSlots.map((slot) => ({
		title: slot.article.title,
		excerpt: slot.article.excerpt,
		url: slot.article.url
	}));

	// Generate briefing using Claude
	console.log('   🤖 Calling Claude API to generate Pip\'s briefing...');
	const pipSummary = await generateDailyBriefing(articles);

	// Store the briefing
	await prisma.dailyBriefing.create({
		data: {
			date: tomorrow,
			pipSummary,
			featuredArticleIds: JSON.stringify(tomorrowSlots.map((slot) => slot.article.id))
		}
	});

	console.log('   ✅ Daily briefing generated and saved');
	console.log(`   Preview: "${pipSummary.substring(0, 100)}..."`);
}

/**
 * Generate Pip's daily briefing for today's top articles
 * (for testing/manual use)
 */
async function generateBriefingForToday() {
	console.log('\n📰 Generating Pip\'s briefing for today...');

	const today = new Date();
	today.setHours(0, 0, 0, 0);

	// Delete existing briefing for today if it exists
	await prisma.dailyBriefing.deleteMany({
		where: { date: today }
	});

	// Get today's slots ordered by position to find the top 3 articles
	const todaySlots = await prisma.dailySlot.findMany({
		where: { date: today },
		include: {
			article: {
				select: {
					id: true,
					title: true,
					excerpt: true,
					url: true
				}
			}
		},
		orderBy: { position: 'asc' },
		take: 3
	});

	if (todaySlots.length === 0) {
		console.log('   ⚠️  No articles found for today');
		return;
	}

	console.log(`   Found ${todaySlots.length} article(s) for briefing`);

	const articles = todaySlots.map((slot) => ({
		title: slot.article.title,
		excerpt: slot.article.excerpt,
		url: slot.article.url
	}));

	console.log('   🤖 Calling Claude API to generate Pip\'s briefing...');
	const pipSummary = await generateDailyBriefing(articles);

	await prisma.dailyBriefing.create({
		data: {
			date: today,
			pipSummary,
			featuredArticleIds: JSON.stringify(todaySlots.map((slot) => slot.article.id))
		}
	});

	console.log('   ✅ Daily briefing generated and saved for today');
	console.log(`   Preview: "${pipSummary.substring(0, 100)}..."`);
}

// Run if this file is executed directly
if (import.meta.main) {
	main();
}

export {
	fetchAllFeeds,
	storeArticle,
	createDailySlotsForTomorrow,
	createDailySlotsForToday,
	regenerateDailySlotsForToday,
	generateCrayonDrawingsForTomorrow,
	generateCrayonDrawingsForToday,
	generateBriefingForTomorrow,
	generateBriefingForToday
};
