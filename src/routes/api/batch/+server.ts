// Batch job API - status and manual trigger
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getCronStatus, triggerBatchNow } from '$lib/server/cron';

/**
 * GET /api/batch - Get cron status
 */
export const GET: RequestHandler = async () => {
	const status = getCronStatus();
	return json(status);
};

/**
 * POST /api/batch - Manually trigger batch job
 */
export const POST: RequestHandler = async () => {
	try {
		// Run batch in background (don't await)
		triggerBatchNow().catch(console.error);

		return json({
			success: true,
			message: "Batch job started. Check server logs for progress."
		});
	} catch (error) {
		return json({
			success: false,
			message: error instanceof Error ? error.message : 'Unknown error'
		}, { status: 500 });
	}
};
