// RSS/Atom feed parsing utilities
// Custom implementation using fetch and XML parsing

export interface FeedItem {
	url: string;
	title: string;
	publishedAt: Date | null;
	excerpt?: string;
	imageUrl?: string;
	imageWidth?: number;
	imageHeight?: number;
}

export interface ParsedFeed {
	feedTitle: string;
	siteUrl?: string;
	items: FeedItem[];
}

/**
 * Fetch and parse an RSS or Atom feed
 */
export async function fetchAndParseFeed(feedUrl: string): Promise<ParsedFeed> {
	const response = await fetch(feedUrl, {
		headers: {
			'User-Agent': 'Newsboy/1.0 (RSS Reader)'
		}
	});

	if (!response.ok) {
		throw new Error(`Failed to fetch feed: ${response.status} ${response.statusText}`);
	}

	const xml = await response.text();
	return parseFeed(xml);
}

/**
 * Parse RSS or Atom XML into structured data
 */
export function parseFeed(xml: string): ParsedFeed {
	// Simple XML parsing using regex and string manipulation
	// This handles both RSS 2.0 and Atom feeds

	const isAtom = xml.includes('<feed') && xml.includes('xmlns="http://www.w3.org/2005/Atom"');

	if (isAtom) {
		return parseAtomFeed(xml);
	} else {
		return parseRssFeed(xml);
	}
}

/**
 * Parse RSS 2.0 feed
 */
function parseRssFeed(xml: string): ParsedFeed {
	// Extract feed title
	const feedTitle = extractText(xml, '<title>', '</title>') || 'Untitled Feed';

	// Extract site URL
	const siteUrl = extractText(xml, '<link>', '</link>');

	// Extract all items
	const itemMatches = xml.match(/<item[^>]*>[\s\S]*?<\/item>/gi) || [];

	const items: FeedItem[] = itemMatches.map((itemXml) => {
		const url = extractText(itemXml, '<link>', '</link>') || extractText(itemXml, '<guid>', '</guid>') || '';
		const title = extractText(itemXml, '<title>', '</title>') || 'Untitled';
		const description = extractText(itemXml, '<description>', '</description>') ||
		                   extractText(itemXml, '<content:encoded>', '</content:encoded>');
		const pubDate = extractText(itemXml, '<pubDate>', '</pubDate>');

		// Extract image from various sources
		let imageUrl: string | undefined;
		let imageWidth: number | undefined;
		let imageHeight: number | undefined;

		// Try media:content
		const mediaContent = itemXml.match(/<media:content[^>]*>/i)?.[0];
		if (mediaContent) {
			imageUrl = mediaContent.match(/url=["']([^"']+)["']/)?.[1];
			const widthMatch = mediaContent.match(/width=["'](\d+)["']/);
			const heightMatch = mediaContent.match(/height=["'](\d+)["']/);
			if (widthMatch) imageWidth = parseInt(widthMatch[1]);
			if (heightMatch) imageHeight = parseInt(heightMatch[1]);
		}

		// Try enclosure
		if (!imageUrl) {
			const enclosure = itemXml.match(/<enclosure[^>]*>/i)?.[0];
			if (enclosure && enclosure.match(/type=["']image\//)) {
				imageUrl = enclosure.match(/url=["']([^"']+)["']/)?.[1];
			}
		}

		// Try finding image in description
		if (!imageUrl && description) {
			const imgMatch = description.match(/<img[^>]+src=["']([^"']+)["']/i);
			if (imgMatch) {
				imageUrl = imgMatch[1];
			}
		}

		return {
			url: url.trim(),
			title: cleanHtml(title),
			publishedAt: pubDate ? parseDate(pubDate) : null,
			excerpt: description ? cleanHtml(description).substring(0, 500) : undefined,
			imageUrl,
			imageWidth,
			imageHeight
		};
	}).filter(item => item.url); // Only keep items with valid URLs

	return {
		feedTitle,
		siteUrl,
		items
	};
}

/**
 * Parse Atom feed
 */
function parseAtomFeed(xml: string): ParsedFeed {
	// Extract feed title
	const feedTitle = extractText(xml, '<title>', '</title>') || 'Untitled Feed';

	// Extract site URL from alternate link
	const linkMatch = xml.match(/<link[^>]*rel=["']alternate["'][^>]*>/i);
	const siteUrl = linkMatch ? linkMatch[0].match(/href=["']([^"']+)["']/)?.[1] : undefined;

	// Extract all entries
	const entryMatches = xml.match(/<entry[^>]*>[\s\S]*?<\/entry>/gi) || [];

	const items: FeedItem[] = entryMatches.map((entryXml) => {
		// Get link
		const linkMatch = entryXml.match(/<link[^>]*rel=["']alternate["'][^>]*>/i) ||
		                  entryXml.match(/<link[^>]*>/i);
		const url = linkMatch ? linkMatch[0].match(/href=["']([^"']+)["']/)?.[1] || '' : '';

		const title = extractText(entryXml, '<title>', '</title>') || 'Untitled';
		const summary = extractText(entryXml, '<summary>', '</summary>') ||
		               extractText(entryXml, '<content>', '</content>');
		const published = extractText(entryXml, '<published>', '</published>') ||
		                 extractText(entryXml, '<updated>', '</updated>');

		// Try to find image
		let imageUrl: string | undefined;
		const mediaMatch = entryXml.match(/<media:content[^>]*>/i);
		if (mediaMatch) {
			imageUrl = mediaMatch[0].match(/url=["']([^"']+)["']/)?.[1];
		}

		if (!imageUrl && summary) {
			const imgMatch = summary.match(/<img[^>]+src=["']([^"']+)["']/i);
			if (imgMatch) {
				imageUrl = imgMatch[1];
			}
		}

		return {
			url: url.trim(),
			title: cleanHtml(title),
			publishedAt: published ? parseDate(published) : null,
			excerpt: summary ? cleanHtml(summary).substring(0, 500) : undefined,
			imageUrl
		};
	}).filter(item => item.url);

	return {
		feedTitle,
		siteUrl,
		items
	};
}

/**
 * Extract text between XML tags
 * Handles tags with attributes (e.g., <title type="html"> or <link rel="alternate">)
 */
function extractText(xml: string, startTag: string, endTag: string): string | undefined {
	// Build a regex that matches the tag with optional attributes
	// e.g., <title> or <title type="html"> or <title type='html'>
	const tagName = startTag.slice(1, -1); // Remove < and > to get tag name
	const tagRegex = new RegExp(`<${tagName}(?:\\s[^>]*)?>`, 'i');
	const match = xml.match(tagRegex);

	if (!match) return undefined;

	const contentStart = match.index! + match[0].length;
	const endIndex = xml.indexOf(endTag, contentStart);
	if (endIndex === -1) return undefined;

	const content = xml.substring(contentStart, endIndex);

	// Handle CDATA
	if (content.includes('<![CDATA[')) {
		return content.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1').trim();
	}

	return content.trim();
}

/**
 * Remove HTML tags and decode entities
 */
function cleanHtml(html: string): string {
	return html
		.replace(/<[^>]+>/g, '') // Remove HTML tags
		.replace(/&quot;/g, '"')
		.replace(/&apos;/g, "'")
		.replace(/&lt;/g, '<')
		.replace(/&gt;/g, '>')
		.replace(/&amp;/g, '&')
		.replace(/\s+/g, ' ') // Normalize whitespace
		.trim();
}

/**
 * Parse various date formats found in RSS/Atom feeds
 */
function parseDate(dateString: string): Date | null {
	try {
		const date = new Date(dateString);
		if (!isNaN(date.getTime())) {
			return date;
		}
	} catch {
		// Fall through to null
	}
	return null;
}
