// API endpoint for getting a specific date's briefing
// GET /api/briefing/[date] - Get briefing for a specific date (YYYY-MM-DD format)

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { prisma } from '$lib/server/db';

/**
 * GET /api/briefing/[date]
 * Returns the briefing for a specific date
 */
export const GET: RequestHandler = async ({ params }) => {
	try {
		const { date: dateParam } = params;

		// Parse date (expecting YYYY-MM-DD format)
		const requestedDate = new Date(dateParam);
		requestedDate.setHours(0, 0, 0, 0);

		// Validate date
		if (isNaN(requestedDate.getTime())) {
			return json(
				{ error: 'Invalid date format. Expected YYYY-MM-DD' },
				{ status: 400 }
			);
		}

		const briefing = await prisma.dailyBriefing.findUnique({
			where: { date: requestedDate }
		});

		if (!briefing) {
			return json(
				{
					briefing: null,
					message: `No briefing found for ${dateParam}, gov'nor!`
				},
				{ status: 404 }
			);
		}

		// Parse featured article IDs
		const featuredArticleIds = JSON.parse(briefing.featuredArticleIds) as string[];

		// Fetch the featured articles with their source info
		const articles = await prisma.article.findMany({
			where: {
				id: { in: featuredArticleIds }
			},
			include: {
				source: true
			}
		});

		// Sort articles in the same order as featuredArticleIds
		const sortedArticles = featuredArticleIds
			.map((id) => articles.find((a) => a.id === id))
			.filter(Boolean);

		return json({
			briefing: {
				id: briefing.id,
				date: briefing.date.toISOString(),
				pipSummary: briefing.pipSummary,
				generatedAt: briefing.generatedAt.toISOString(),
				featuredArticles: sortedArticles
			}
		});
	} catch (error) {
		console.error('Error fetching briefing:', error);
		return json(
			{ error: 'Failed to fetch briefing' },
			{ status: 500 }
		);
	}
};
