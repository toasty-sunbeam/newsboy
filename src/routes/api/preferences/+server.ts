import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';

const DEFAULT_PREFERENCES_ID = 'default';

/**
 * Ensure that the default user preferences record exists in the database.
 * Creates it if it doesn't exist.
 */
async function ensureDefaultPreferences() {
	const existing = await db.userPreferences.findUnique({
		where: { id: DEFAULT_PREFERENCES_ID }
	});

	if (!existing) {
		return await db.userPreferences.create({
			data: {
				id: DEFAULT_PREFERENCES_ID,
				interests: '{}',
				sourceWeights: '{}',
				moodBalance: 0,
				preferLongForm: false,
				preferVisual: true
			}
		});
	}

	return existing;
}

/**
 * GET /api/preferences
 * Returns the current user preferences
 */
export const GET: RequestHandler = async () => {
	try {
		const preferences = await ensureDefaultPreferences();

		// Parse JSON fields for easier consumption
		const response = {
			...preferences,
			interests: JSON.parse(preferences.interests),
			sourceWeights: JSON.parse(preferences.sourceWeights)
		};

		return json(response);
	} catch (error) {
		console.error('Error fetching preferences:', error);
		return json(
			{ error: 'Failed to fetch preferences' },
			{ status: 500 }
		);
	}
};

/**
 * PUT /api/preferences
 * Updates user preferences
 *
 * Request body can include:
 * - interests: Record<string, number> (topic weights, e.g., {"robotics": 0.8})
 * - sourceWeights: Record<string, number> (source boost/suppress)
 * - moodBalance: number (-1 to +1)
 * - preferLongForm: boolean
 * - preferVisual: boolean
 */
export const PUT: RequestHandler = async ({ request }) => {
	try {
		const updates = await request.json();

		// Ensure default preferences exist first
		await ensureDefaultPreferences();

		// Prepare the data for update
		const data: any = {};

		// Handle JSON fields - stringify if they're objects
		if (updates.interests !== undefined) {
			data.interests = typeof updates.interests === 'string'
				? updates.interests
				: JSON.stringify(updates.interests);
		}

		if (updates.sourceWeights !== undefined) {
			data.sourceWeights = typeof updates.sourceWeights === 'string'
				? updates.sourceWeights
				: JSON.stringify(updates.sourceWeights);
		}

		// Handle scalar fields
		if (updates.moodBalance !== undefined) {
			// Clamp moodBalance to [-1, 1]
			data.moodBalance = Math.max(-1, Math.min(1, updates.moodBalance));
		}

		if (updates.preferLongForm !== undefined) {
			data.preferLongForm = Boolean(updates.preferLongForm);
		}

		if (updates.preferVisual !== undefined) {
			data.preferVisual = Boolean(updates.preferVisual);
		}

		// Update the preferences
		const updated = await db.userPreferences.update({
			where: { id: DEFAULT_PREFERENCES_ID },
			data
		});

		// Parse JSON fields for response
		const response = {
			...updated,
			interests: JSON.parse(updated.interests),
			sourceWeights: JSON.parse(updated.sourceWeights)
		};

		return json(response);
	} catch (error) {
		console.error('Error updating preferences:', error);
		return json(
			{ error: 'Failed to update preferences' },
			{ status: 500 }
		);
	}
};
