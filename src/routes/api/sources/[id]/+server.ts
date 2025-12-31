// API endpoint for individual source management
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { prisma } from '$lib/server/db';

/**
 * DELETE /api/sources/[id]
 * Deletes a source
 */
export const DELETE: RequestHandler = async ({ params }) => {
	try {
		await prisma.source.delete({
			where: { id: params.id }
		});
		return json({ success: true, message: 'Source deleted' });
	} catch (error) {
		console.error('Error deleting source:', error);
		return json({ error: 'Failed to delete source' }, { status: 500 });
	}
};

/**
 * PUT /api/sources/[id]
 * Updates a source (currently just enabled/disabled toggle)
 */
export const PUT: RequestHandler = async ({ params, request }) => {
	try {
		const { enabled } = await request.json();

		if (typeof enabled !== 'boolean') {
			return json({ error: 'Invalid request: enabled must be a boolean' }, { status: 400 });
		}

		const source = await prisma.source.update({
			where: { id: params.id },
			data: { enabled }
		});
		return json({ success: true, source });
	} catch (error) {
		console.error('Error updating source:', error);
		return json({ error: 'Failed to update source' }, { status: 500 });
	}
};
