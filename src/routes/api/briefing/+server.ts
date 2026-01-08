// API endpoint for daily briefing
// GET /api/briefing - Get today's briefing
// GET /api/briefings - List all past briefings (for history browsing)

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { prisma } from '$lib/server/db';

/**
 * GET /api/briefing
 * Returns today's daily briefing with featured articles
 */
export const GET: RequestHandler = async ({ url }) => {
	try {
		const listAll = url.searchParams.get('all') === 'true';

		// If ?all=true, return list of all briefings
		if (listAll) {
			const briefings = await prisma.dailyBriefing.findMany({
				orderBy: { date: 'desc' },
				select: {
					id: true,
					date: true,
					pipSummary: true,
					generatedAt: true
				}
			});

			return json({
				briefings: briefings.map((b) => ({
					id: b.id,
					date: b.date.toISOString(),
					preview: b.pipSummary.substring(0, 100) + '...',
					generatedAt: b.generatedAt.toISOString()
				}))
			});
		}

		// Otherwise, return today's briefing
		const today = new Date();
		today.setHours(0, 0, 0, 0);

		const briefing = await prisma.dailyBriefing.findUnique({
			where: { date: today }
		});

		if (!briefing) {
			return json(
				{
					briefing: null,
					message: "No briefing available for today yet, gov'nor!"
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
