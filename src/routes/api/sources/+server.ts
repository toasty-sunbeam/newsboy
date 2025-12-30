// API endpoint for managing RSS sources
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getAllSources } from '$lib/server/opml';

/**
 * GET /api/sources
 * Returns all RSS sources
 */
export const GET: RequestHandler = async () => {
	try {
		const sources = await getAllSources();
		return json({ sources });
	} catch (error) {
		console.error('Error fetching sources:', error);
		return json({ error: 'Failed to fetch sources' }, { status: 500 });
	}
};
