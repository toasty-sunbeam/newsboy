// Open Graph image extraction
// Fetches article pages and extracts og:image meta tags for articles missing images

/**
 * Fetch the og:image URL from an article's page
 * Returns null if no image found or on error
 */
export async function fetchOgImage(url: string): Promise<string | null> {
	try {
		const response = await fetch(url, {
			headers: {
				'User-Agent': 'Newsboy/1.0 (RSS Reader)',
				'Accept': 'text/html'
			},
			redirect: 'follow',
			signal: AbortSignal.timeout(10000) // 10s timeout
		});

		if (!response.ok) return null;

		// Only read the first chunk of HTML — og:image is always in <head>
		const html = await response.text();
		// Limit parsing to first 50KB to avoid processing huge pages
		const head = html.substring(0, 50000);

		// Try og:image first (most common)
		let imageUrl = extractMetaContent(head, 'og:image');

		// Try twitter:image as fallback
		if (!imageUrl) {
			imageUrl = extractMetaContent(head, 'twitter:image');
			if (!imageUrl) {
				imageUrl = extractMetaContent(head, 'twitter:image:src');
			}
		}

		if (!imageUrl) return null;

		// Resolve relative URLs
		if (imageUrl.startsWith('//')) {
			imageUrl = 'https:' + imageUrl;
		} else if (imageUrl.startsWith('/')) {
			try {
				const base = new URL(url);
				imageUrl = base.origin + imageUrl;
			} catch {
				return null;
			}
		}

		// Basic validation — must look like a URL
		if (!imageUrl.startsWith('http://') && !imageUrl.startsWith('https://')) {
			return null;
		}

		return imageUrl;
	} catch {
		// Network error, timeout, etc. — just skip
		return null;
	}
}

/**
 * Extract content from a meta tag by property or name
 */
function extractMetaContent(html: string, property: string): string | null {
	// Match <meta property="og:image" content="..."> or <meta name="twitter:image" content="...">
	// Also handles reversed attribute order: <meta content="..." property="og:image">
	const patterns = [
		new RegExp(`<meta[^>]+(?:property|name)=["']${escapeRegex(property)}["'][^>]+content=["']([^"']+)["']`, 'i'),
		new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']${escapeRegex(property)}["']`, 'i')
	];

	for (const pattern of patterns) {
		const match = html.match(pattern);
		if (match?.[1]) {
			return match[1];
		}
	}

	return null;
}

function escapeRegex(str: string): string {
	return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
