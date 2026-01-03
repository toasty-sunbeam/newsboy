// Unsplash API endpoint - fetches a random calming image
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { UNSPLASH_ACCESS_KEY } from '$env/static/private';

export const GET: RequestHandler = async () => {
	try {
		if (!UNSPLASH_ACCESS_KEY) {
			return json({ error: 'Unsplash API key not configured' }, { status: 500 });
		}

		// Fetch a random photo from Unsplash with calming themes
		// Collections: nature (1459961), minimalism (1065976), architecture (1254279)
		// Topics: nature, travel, architecture, wallpapers
		const topics = ['nature', 'landscape', 'minimal', 'architecture', 'space'];
		const randomTopic = topics[Math.floor(Math.random() * topics.length)];

		const url = new URL('https://api.unsplash.com/photos/random');
		url.searchParams.set('query', randomTopic);
		url.searchParams.set('orientation', 'landscape');
		url.searchParams.set('content_filter', 'high');

		const response = await fetch(url.toString(), {
			headers: {
				Authorization: `Client-ID ${UNSPLASH_ACCESS_KEY}`
			}
		});

		if (!response.ok) {
			console.error('Unsplash API error:', await response.text());
			return json({ error: 'Failed to fetch image from Unsplash' }, { status: response.status });
		}

		const data = await response.json();

		return json({
			imageUrl: data.urls.regular,
			imageUrlFull: data.urls.full,
			imageUrlThumb: data.urls.thumb,
			photographer: data.user.name,
			photographerUrl: data.user.links.html,
			downloadUrl: data.links.download_location,
			description: data.description || data.alt_description || 'A calming image',
			color: data.color
		});
	} catch (error) {
		console.error('Error fetching Unsplash image:', error);
		return json(
			{
				error: 'Failed to fetch calming image'
			},
			{ status: 500 }
		);
	}
};
