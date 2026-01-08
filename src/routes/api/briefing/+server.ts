// API endpoint for daily briefing
// GET /api/briefing - Get today's briefing
// GET /api/briefings - List all past briefings (for history browsing)

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { prisma } from '$lib/server/db';

/**
 * GET /api/briefing
 * Returns today's daily briefing with featured articles
 * Supports ?date=YYYY-MM-DD to fetch a specific date's briefing
 */
export const GET: RequestHandler = async ({ url }) => {
	try {
		const listAll = url.searchParams.get('all') === 'true';
		const dateParam = url.searchParams.get('date');

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

		// Determine which date to fetch
		let targetDate: Date;
		if (dateParam) {
			// Parse the date from the query parameter (YYYY-MM-DD format)
			targetDate = new Date(dateParam);
			targetDate.setHours(0, 0, 0, 0);
		} else {
			// Default to today
			targetDate = new Date();
			targetDate.setHours(0, 0, 0, 0);
		}

		const briefing = await prisma.dailyBriefing.findUnique({
			where: { date: targetDate }
		});

		if (!briefing) {
			return json(
				{
					briefing: null,
					message: "No briefing available for this date, gov'nor!"
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

		// Find previous and next briefings for navigation
		const previousBriefing = await prisma.dailyBriefing.findFirst({
			where: {
				date: { lt: targetDate }
			},
			orderBy: { date: 'desc' },
			select: { date: true }
		});

		const nextBriefing = await prisma.dailyBriefing.findFirst({
			where: {
				date: { gt: targetDate }
			},
			orderBy: { date: 'asc' },
			select: { date: true }
		});

		// Check if this is today's briefing
		const today = new Date();
		today.setHours(0, 0, 0, 0);
		const isToday = targetDate.getTime() === today.getTime();

		return json({
			briefing: {
				id: briefing.id,
				date: briefing.date.toISOString(),
				pipSummary: briefing.pipSummary,
				generatedAt: briefing.generatedAt.toISOString(),
				featuredArticles: sortedArticles
			},
			navigation: {
				isToday,
				previousDate: previousBriefing ? previousBriefing.date.toISOString().split('T')[0] : null,
				nextDate: nextBriefing ? nextBriefing.date.toISOString().split('T')[0] : null
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
