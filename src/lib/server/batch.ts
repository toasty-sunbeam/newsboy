// Nightly batch job: RSS fetching, article storage, scoring, and briefing generation
// Run with: bun run batch

import { prisma } from './db';
import { fetchAndParseFeed, type FeedItem } from './rss';

/**
 * Main batch job entry point
 */
async function main() {
	console.log('=== Newsboy Batch Job Started ===');
	console.log(`Time: ${new Date().toISOString()}`);

	try {
		await fetchAllFeeds();
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

// Run if this file is executed directly
if (import.meta.main) {
	main();
}

export { fetchAllFeeds, storeArticle };
