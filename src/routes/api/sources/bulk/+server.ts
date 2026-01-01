// API endpoint for bulk adding RSS feeds
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { prisma } from '$lib/server/db';

/**
 * POST /api/sources/bulk
 * Accepts an array of RSS URLs and a category, fetches feed info, and creates sources
 */
export const POST: RequestHandler = async ({ request }) => {
	try {
		const { urls, category } = await request.json();

		if (!Array.isArray(urls) || urls.length === 0) {
			return json({ error: 'URLs array is required' }, { status: 400 });
		}

		if (!category || typeof category !== 'string') {
			return json({ error: 'Category is required' }, { status: 400 });
		}

		let added = 0;
		let skipped = 0;

		for (const url of urls) {
			try {
				// Check if feed already exists
				const existing = await prisma.source.findUnique({
					where: { feedUrl: url }
				});

				if (existing) {
					skipped++;
					continue;
				}

				// For now, use a simplified name extraction from URL
				// In Step 4, we'll fetch the actual RSS feed to get the real title
				const name = extractNameFromUrl(url);

				// Detect content type from URL
				const contentType = detectContentTypeFromUrl(url);

				// Create new source
				await prisma.source.create({
					data: {
						name,
						feedUrl: url,
						category,
						contentType,
						enabled: true
					}
				});

				added++;
			} catch (error) {
				console.error(`Failed to add feed ${url}:`, error);
				skipped++;
			}
		}

		return json({
			success: true,
			message: `Added ${added} feeds, skipped ${skipped} duplicates or errors`,
			added,
			skipped
		});
	} catch (error) {
		console.error('Error in bulk add:', error);
		return json(
			{
				error: 'Failed to add feeds',
				details: error instanceof Error ? error.message : 'Unknown error'
			},
			{ status: 500 }
		);
	}
};

/**
 * Extract a name from the feed URL
 * This is a temporary solution - will be replaced with actual RSS feed title in Step 4
 */
function extractNameFromUrl(url: string): string {
	try {
		const urlObj = new URL(url);
		let hostname = urlObj.hostname;

		// Remove www. prefix
		hostname = hostname.replace(/^www\./, '');

		// Capitalize first letter
		const name = hostname.charAt(0).toUpperCase() + hostname.slice(1);

		return name;
	} catch {
		return 'Unknown Feed';
	}
}

/**
 * Detect content type from URL keywords
 */
function detectContentTypeFromUrl(url: string): string {
	const urlLower = url.toLowerCase();

	const comicKeywords = ['comic', 'xkcd', 'smbc', 'cartoon', 'webcomic', 'qwantz'];

	for (const keyword of comicKeywords) {
		if (urlLower.includes(keyword)) {
			return 'webcomic';
		}
	}

	return 'article';
}
