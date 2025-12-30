// OPML import utilities
// Parses OPML files and extracts RSS feed information

import { prisma } from './db';

export interface OpmlOutline {
	text: string;
	title?: string;
	type?: string;
	xmlUrl?: string;
	htmlUrl?: string;
}

export interface OpmlParseResult {
	title?: string;
	feeds: OpmlOutline[];
}

/**
 * Parse OPML XML string and extract feed information
 */
export function parseOpml(opmlContent: string): OpmlParseResult {
	const feeds: OpmlOutline[] = [];
	let title: string | undefined;

	// Simple regex-based parsing for OPML
	// This works for standard OPML format exported from RSS readers

	// Extract title
	const titleMatch = opmlContent.match(/<title>([^<]+)<\/title>/i);
	if (titleMatch) {
		title = titleMatch[1].trim();
	}

	// Extract all outline elements with xmlUrl (RSS feeds)
	const outlineRegex = /<outline[^>]*>/gi;
	const matches = opmlContent.matchAll(outlineRegex);

	for (const match of matches) {
		const outlineTag = match[0];

		// Extract attributes
		const xmlUrl = extractAttribute(outlineTag, 'xmlUrl');
		const htmlUrl = extractAttribute(outlineTag, 'htmlUrl');
		const text = extractAttribute(outlineTag, 'text');
		const titleAttr = extractAttribute(outlineTag, 'title');
		const type = extractAttribute(outlineTag, 'type');

		// Only include outlines that have an xmlUrl (actual feeds)
		if (xmlUrl) {
			feeds.push({
				text: text || titleAttr || 'Untitled Feed',
				title: titleAttr,
				type: type,
				xmlUrl: xmlUrl,
				htmlUrl: htmlUrl
			});
		}
	}

	return { title, feeds };
}

/**
 * Extract attribute value from XML tag
 */
function extractAttribute(tag: string, attrName: string): string | undefined {
	const regex = new RegExp(`${attrName}=["']([^"']+)["']`, 'i');
	const match = tag.match(regex);
	return match ? match[1] : undefined;
}

/**
 * Import OPML feeds into database
 * Returns count of new feeds added
 */
export async function importOpmlToDatabase(opmlContent: string): Promise<{
	added: number;
	skipped: number;
	feeds: OpmlOutline[];
}> {
	const { feeds } = parseOpml(opmlContent);

	let added = 0;
	let skipped = 0;

	for (const feed of feeds) {
		if (!feed.xmlUrl) continue;

		try {
			// Check if feed already exists
			const existing = await prisma.source.findUnique({
				where: { feedUrl: feed.xmlUrl }
			});

			if (existing) {
				skipped++;
				continue;
			}

			// Determine content type based on feed metadata
			// This is a simple heuristic - can be improved later
			const contentType = detectContentType(feed);

			// Create new source
			await prisma.source.create({
				data: {
					name: feed.text,
					feedUrl: feed.xmlUrl,
					siteUrl: feed.htmlUrl || null,
					contentType: contentType,
					enabled: true
				}
			});

			added++;
		} catch (error) {
			console.error(`Failed to import feed ${feed.text}:`, error);
			skipped++;
		}
	}

	return { added, skipped, feeds };
}

/**
 * Detect content type from feed metadata
 * Simple heuristic - can be enhanced with actual feed fetching
 */
function detectContentType(feed: OpmlOutline): string {
	const text = (feed.text + ' ' + (feed.title || '')).toLowerCase();

	// Simple keyword matching for webcomics
	const comicKeywords = ['comic', 'webcomic', 'cartoon', 'strip', 'xkcd', 'smbc'];

	for (const keyword of comicKeywords) {
		if (text.includes(keyword)) {
			return 'webcomic';
		}
	}

	return 'article';
}

/**
 * Get all sources from database
 */
export async function getAllSources() {
	return await prisma.source.findMany({
		orderBy: { name: 'asc' }
	});
}

/**
 * Delete a source by ID
 */
export async function deleteSource(id: string) {
	return await prisma.source.delete({
		where: { id }
	});
}

/**
 * Toggle source enabled status
 */
export async function toggleSource(id: string, enabled: boolean) {
	return await prisma.source.update({
		where: { id },
		data: { enabled }
	});
}
