#!/usr/bin/env bun
// Nightly batch job: RSS fetching, article storage, scoring, and briefing generation
// Run with: bun run src/lib/server/batch.ts

import { prisma } from './db';
import { fetchAndParseFeed, type FeedItem } from './rss';

/**
 * Main batch job entry point
 */
async function main() {
	console.log('=== Newsboy Batch Job Started ===');
	console.log(`Time: ${new Date().toISOString()}`);

	try {
		await runBatchJob();
		console.log('\n=== Batch Job Completed Successfully ===');
	} catch (error) {
		console.error('\n=== Batch Job Failed ===');
		console.error(error);
		process.exit(1);
	}
}

/**
 * Run the complete batch job workflow
 */
async function runBatchJob() {
	// 1. Fetch all RSS feeds
	await fetchAllFeeds();

	// 2. Score and select articles for tomorrow
	await scoreAndScheduleArticles();
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
 * Score recent articles and schedule them for tomorrow's drip feed
 */
async function scoreAndScheduleArticles() {
	console.log('\n📊 Scoring and scheduling articles...');

	// Get tomorrow's date (normalized to start of day)
	const tomorrow = new Date();
	tomorrow.setDate(tomorrow.getDate() + 1);
	tomorrow.setHours(0, 0, 0, 0);

	// Check if we already have slots for tomorrow
	const existingSlots = await prisma.dailySlot.findMany({
		where: {
			date: tomorrow
		}
	});

	if (existingSlots.length > 0) {
		console.log(`   ⚠️  Already have ${existingSlots.length} slots scheduled for tomorrow. Skipping.`);
		return;
	}

	// Get user preferences
	const prefs = await prisma.userPreferences.findFirst({
		where: { id: 'default' }
	});

	// If no preferences exist, create default ones
	if (!prefs) {
		await prisma.userPreferences.create({
			data: {
				id: 'default',
				interests: JSON.stringify({
					technology: 0.8,
					science: 0.7,
					maker: 0.6,
					gaming: 0.5,
					'good-news': 0.9
				})
			}
		});
	}

	// Get articles from the last 24 hours that haven't been scheduled yet
	const yesterday = new Date();
	yesterday.setDate(yesterday.getDate() - 1);

	const articles = await prisma.article.findMany({
		where: {
			fetchedAt: {
				gte: yesterday
			},
			dailySlots: {
				none: {}
			}
		},
		include: {
			source: true
		},
		orderBy: {
			fetchedAt: 'desc'
		}
	});

	console.log(`   Found ${articles.length} unscheduled articles from last 24 hours`);

	if (articles.length === 0) {
		console.log('   No new articles to schedule.');
		return;
	}

	// Score articles (simple scoring for MVP - will enhance later)
	const scoredArticles = articles.map(article => ({
		...article,
		score: scoreArticle(article, prefs)
	})).sort((a, b) => b.score - a.score);

	// Select top 24 articles (or fewer if we don't have enough)
	const selectedCount = Math.min(24, scoredArticles.length);
	const selected = scoredArticles.slice(0, selectedCount);

	console.log(`   Selected top ${selected.length} articles for tomorrow`);

	// Create daily slots with drip schedule:
	// - 10 articles at hour 0 (midnight/first load)
	// - 2 articles per hour for hours 1-7 (14 more articles)
	const slots = [];
	let position = 0;

	for (let i = 0; i < selected.length; i++) {
		let revealHour = 0;

		if (i < 10) {
			// First 10 articles reveal at midnight
			revealHour = 0;
		} else {
			// Remaining articles drip 2 per hour starting at hour 1
			const remaining = i - 10;
			revealHour = Math.floor(remaining / 2) + 1;
		}

		slots.push({
			date: tomorrow,
			articleId: selected[i].id,
			revealHour,
			position: position++
		});
	}

	// Save all slots
	await prisma.dailySlot.createMany({
		data: slots
	});

	console.log(`   ✅ Created ${slots.length} daily slots for tomorrow`);
	console.log(`   Distribution: 10 at midnight, then 2/hour until hour ${Math.max(...slots.map(s => s.revealHour))}`);

	// Update relevance scores in the database
	for (const article of selected) {
		await prisma.article.update({
			where: { id: article.id },
			data: { relevanceScore: article.score }
		});
	}
}

/**
 * Simple article scoring algorithm
 * Returns a score between 0 and 100
 */
function scoreArticle(article: any, prefs: any): number {
	let score = 50; // Base score

	// Boost for having images
	if (article.heroImageUrl) {
		score += 10;
	}

	// Recency bonus (articles published in last 12 hours get boost)
	if (article.publishedAt) {
		const hoursOld = (Date.now() - new Date(article.publishedAt).getTime()) / (1000 * 60 * 60);
		if (hoursOld < 12) {
			score += 15;
		} else if (hoursOld < 24) {
			score += 10;
		}
	}

	// Webcomics get a small boost (variety)
	if (article.contentType === 'webcomic') {
		score += 5;
	}

	// Source diversity (will enhance this later with actual preference matching)
	// For now, just add some randomness to prevent same-source clustering
	score += Math.random() * 10;

	return Math.min(100, Math.max(0, score));
}

// Run if this file is executed directly
if (import.meta.main) {
	main();
}

export { fetchAllFeeds, storeArticle, runBatchJob };
