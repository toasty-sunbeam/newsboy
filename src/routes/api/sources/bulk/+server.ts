// API endpoint for bulk adding RSS feeds
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { prisma } from '$lib/server/db';
import { resolveFeed } from '$lib/server/rss';

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
		const failed: { url: string; reason: string }[] = [];

		for (const rawUrl of urls) {
			const url = String(rawUrl).trim();
			if (!url) continue;
			try {
				// Accept a feed URL or a website URL; find the real feed either way
				const { feedUrl, feed } = await resolveFeed(url);

				const existing = await prisma.source.findUnique({ where: { feedUrl } });
				if (existing) {
					skipped++;
					continue;
				}

				await prisma.source.create({
					data: {
						name: feed.feedTitle || extractNameFromUrl(url),
						feedUrl,
						siteUrl: feedUrl !== url ? url : feed.siteUrl || null,
						category,
						contentType: detectContentTypeFromUrl(url),
						enabled: true,
						lastItemCount: feed.items.length
					}
				});
				added++;
			} catch (error) {
				const reason = error instanceof Error ? error.message : 'Unknown error';
				console.error(`Failed to add feed ${url}:`, reason);
				failed.push({ url, reason });
			}
		}

		const parts = [`Added ${added} feed${added === 1 ? '' : 's'}`];
		if (skipped) parts.push(`${skipped} already there`);
		if (failed.length) parts.push(`couldn't find a feed for: ${failed.map((f) => f.url).join(', ')}`);

		return json({
			success: failed.length === 0,
			message: parts.join('; '),
			added,
			skipped,
			failed
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
