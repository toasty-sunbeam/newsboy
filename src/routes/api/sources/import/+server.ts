// API endpoint for OPML import
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { importOpmlToDatabase } from '$lib/server/opml';

/**
 * POST /api/sources/import
 * Accepts OPML file upload and imports feeds into database
 */
export const POST: RequestHandler = async ({ request }) => {
	try {
		const formData = await request.formData();
		const file = formData.get('opml') as File;

		if (!file) {
			return json({ error: 'No file provided' }, { status: 400 });
		}

		// Read file content
		const opmlContent = await file.text();

		// Import to database
		const result = await importOpmlToDatabase(opmlContent);

		return json({
			success: true,
			message: `Imported ${result.added} feeds, skipped ${result.skipped} duplicates`,
			added: result.added,
			skipped: result.skipped,
			totalFeeds: result.feeds.length
		});
	} catch (error) {
		console.error('Error importing OPML:', error);
		return json(
			{
				error: 'Failed to import OPML',
				details: error instanceof Error ? error.message : 'Unknown error'
			},
			{ status: 500 }
		);
	}
};
