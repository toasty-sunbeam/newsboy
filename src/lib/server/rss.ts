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

const FETCH_HEADERS = {
	'User-Agent': 'Mozilla/5.0 (compatible; Newsboy/1.0; +https://github.com/toasty-sunbeam/newsboy)',
	Accept: 'application/rss+xml, application/atom+xml, application/xml;q=0.9, text/xml;q=0.9, text/html;q=0.8, */*;q=0.5'
};

// Paths to try when a page doesn't advertise its feed
const COMMON_FEED_PATHS = ['/feed', '/feed/', '/rss', '/rss.xml', '/feed.xml', '/atom.xml', '/index.xml', '/feeds/posts/default'];

async function fetchText(url: string): Promise<{ text: string; finalUrl: string }> {
	const response = await fetch(url, { headers: FETCH_HEADERS, redirect: 'follow', signal: AbortSignal.timeout(20000) });
	if (!response.ok) {
		throw new Error(`HTTP ${response.status} ${response.statusText} from ${url}`);
	}
	return { text: await response.text(), finalUrl: response.url || url };
}

/** True if the document is an RSS, Atom or RDF feed rather than an HTML page */
export function looksLikeFeed(text: string): boolean {
	const head = text.slice(0, 2000).toLowerCase();
	if (head.includes('<html') || head.includes('<!doctype html')) return false;
	return /<rss[\s>]|<feed[\s>]|<rdf:rdf[\s>]/.test(head);
}

/** Feed URLs advertised in an HTML page's <link rel="alternate"> tags */
function findAdvertisedFeeds(html: string, baseUrl: string): string[] {
	const found: string[] = [];
	for (const tag of html.match(/<link\b[^>]*>/gi) || []) {
		const rel = tag.match(/rel=["']([^"']+)["']/i)?.[1]?.toLowerCase() ?? '';
		const type = tag.match(/type=["']([^"']+)["']/i)?.[1]?.toLowerCase() ?? '';
		const href = tag.match(/href=["']([^"']+)["']/i)?.[1];
		if (!href || !rel.split(/\s+/).includes('alternate')) continue;
		if (!/(rss|atom)\+xml|application\/xml|text\/xml/.test(type)) continue;
		// Skip per-post comment feeds, which many WordPress pages advertise
		if (/comments/i.test(href) && found.length > 0) continue;
		try {
			found.push(new URL(href.replace(/&amp;/g, '&'), baseUrl).toString());
		} catch {
			/* ignore malformed href */
		}
	}
	return found;
}

export interface ResolvedFeed {
	feedUrl: string;
	feed: ParsedFeed;
}

/**
 * Turn whatever the user pasted (a feed URL or a website URL) into a working feed.
 * Like FreshRSS: use the URL if it's a feed, else look for an advertised feed,
 * else try common feed paths. Throws if nothing works.
 */
export async function resolveFeed(inputUrl: string): Promise<ResolvedFeed> {
	const { text, finalUrl } = await fetchText(inputUrl);
	if (looksLikeFeed(text)) {
		return { feedUrl: inputUrl, feed: parseFeed(text) };
	}

	const base = new URL(finalUrl);
	const candidates = [
		...findAdvertisedFeeds(text, finalUrl),
		...COMMON_FEED_PATHS.map((path) => new URL(path, base.origin).toString())
	];

	const tried = new Set<string>();
	for (const candidate of candidates) {
		if (tried.has(candidate)) continue;
		tried.add(candidate);
		try {
			const result = await fetchText(candidate);
			if (looksLikeFeed(result.text)) {
				return { feedUrl: candidate, feed: parseFeed(result.text) };
			}
		} catch {
			/* try the next candidate */
		}
	}

	throw new Error(`No RSS or Atom feed found at ${inputUrl}`);
}

/**
 * Fetch and parse an RSS or Atom feed. Throws if the URL returns something
 * that isn't a feed (e.g. a website homepage), so the problem gets reported
 * instead of silently yielding zero articles.
 */
export async function fetchAndParseFeed(feedUrl: string): Promise<ParsedFeed> {
	const { text } = await fetchText(feedUrl);
	if (!looksLikeFeed(text)) {
		throw new Error(`Not a feed (got an HTML page): ${feedUrl}`);
	}
	return parseFeed(text);
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
