// Feed API endpoint - returns today's articles with drip logic
import { json } from '@sveltejs/kit';
import { prisma } from '$lib/server/db';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ url }) => {
	try {
		const currentHour = new Date().getHours();

		// Testing parameter to simulate caught-up state
		const testCaughtUp = url.searchParams.get('test') === 'caughtup';

		// Get today's date at midnight for querying
		const today = new Date();
		today.setHours(0, 0, 0, 0);

		// Check if we have daily slots for today
		const todaySlots = await prisma.dailySlot.findMany({
			where: { date: today },
			include: {
				article: {
					include: { source: true }
				}
			},
			orderBy: { position: 'asc' }
		});

		// If we have slots, use the drip system
		if (todaySlots.length > 0) {
			// Filter to only show articles that have been revealed (or all if testing)
			const revealedSlots = testCaughtUp
				? todaySlots
				: todaySlots.filter((slot) => slot.revealHour <= currentHour);
			const articles = revealedSlots.map((slot) => slot.article);

			// Calculate drip status
			const totalForToday = todaySlots.length;
			const revealedCount = revealedSlots.length;
			const remainingCount = testCaughtUp ? 0 : totalForToday - revealedCount;

			// Find the next reveal time
			const nextSlot = todaySlots.find((slot) => slot.revealHour > currentHour);
			const nextRevealHour = nextSlot ? nextSlot.revealHour : null;
			const nextRevealCount = nextSlot
				? todaySlots.filter((s) => s.revealHour === nextSlot.revealHour).length
				: 0;

			return json({
				articles,
				total: articles.length,
				drip: {
					enabled: true,
					totalForToday,
					revealedCount,
					remainingCount,
					currentHour,
					nextRevealHour: testCaughtUp ? null : nextRevealHour,
					nextRevealCount
				}
			});
		}

		// Fallback: If no slots exist for today, return all recent articles
		// This handles the case before the first batch run or for testing
		const fallbackMode = url.searchParams.get('fallback') !== 'false';

		if (fallbackMode) {
			const articles = await prisma.article.findMany({
				include: { source: true },
				orderBy: [{ publishedAt: 'desc' }, { fetchedAt: 'desc' }],
				take: 24
			});

			// Support test mode even in fallback
			const dripStatus = testCaughtUp
				? {
						enabled: true,
						totalForToday: articles.length,
						revealedCount: articles.length,
						remainingCount: 0,
						currentHour,
						nextRevealHour: null,
						nextRevealCount: 0
				  }
				: {
						enabled: false,
						message: 'No daily slots found. Showing recent articles.'
				  };

			return json({
				articles,
				total: articles.length,
				drip: dripStatus
			});
		}

		// If fallback is disabled and no slots exist, return empty
		return json({
			articles: [],
			total: 0,
			drip: {
				enabled: false,
				message: 'No daily slots found for today.'
			}
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
