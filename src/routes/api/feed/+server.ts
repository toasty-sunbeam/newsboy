// Feed API endpoint - returns all articles (no drip logic for MVP)
import { json } from '@sveltejs/kit';
import { prisma } from '$lib/server/db';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async () => {
	try {
		// Fetch all articles with their source information
		// Sort by publishedAt (newest first), fall back to fetchedAt
		const articles = await prisma.article.findMany({
			include: {
				source: true
			},
			orderBy: [
				{ publishedAt: 'desc' },
				{ fetchedAt: 'desc' }
			]
		});

		return json({
			articles,
			total: articles.length
		});
	} catch (error) {
		console.error('Error fetching articles:', error);
		return json(
			{
				error: 'Failed to fetch articles',
				articles: [],
				total: 0
			},
			{ status: 500 }
		);
	}
};
