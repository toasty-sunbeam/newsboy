// Batch job API - status and manual trigger
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getCronStatus, triggerBatchNow } from '$lib/server/cron';
import { regenerateDailySlotsForToday, generateCrayonDrawingsForToday, generateBriefingForToday } from '$lib/server/batch';
import { scoreArticles } from '$lib/server/scoring';

/**
 * GET /api/batch - Get cron status
 */
export const GET: RequestHandler = async () => {
	const status = getCronStatus();
	return json(status);
};

/**
 * POST /api/batch - Manually trigger batch job or regenerate slots
 * Query params:
 *   - regenerate=true: Only regenerate today's slots (faster, no RSS fetch)
 *   - crayons=true: Only generate crayon drawings for today's image-less articles
 *   - briefing=true: Only generate today's briefing
 */
export const POST: RequestHandler = async ({ url }) => {
	const regenerate = url.searchParams.get('regenerate') === 'true';
	const crayons = url.searchParams.get('crayons') === 'true';
	const briefing = url.searchParams.get('briefing') === 'true';

	try {
		if (briefing) {
			// Generate briefing for today
			await generateBriefingForToday();
			return json({
				success: true,
				message: 'Generated today\'s briefing successfully'
			});
		}

		if (crayons) {
			// Generate crayon drawings for today's articles that need them
			const count = await generateCrayonDrawingsForToday();
			return json({
				success: true,
				message: `Generated ${count} crayon drawing${count !== 1 ? 's' : ''} for today's articles`,
				count
			});
		}

		if (regenerate) {
			// Re-score articles with current preferences, then regenerate slots
			await scoreArticles();
			const result = await regenerateDailySlotsForToday();

			// Also generate today's briefing
			await generateBriefingForToday();

			return json({
				success: true,
				message: `Regenerated feed: ${result.created} articles slotted for today, briefing generated`,
				...result
			});
		}

		// Run full batch in background (don't await)
		triggerBatchNow().catch(console.error);

		return json({
			success: true,
			message: 'Batch job started. Check server logs for progress.'
		});
	} catch (error) {
		return json(
			{
				success: false,
				message: error instanceof Error ? error.message : 'Unknown error'
			},
			{ status: 500 }
		);
	}
};
