// Conversational tuning API - talk to Pip to adjust feed preferences
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { prisma } from '$lib/server/db';
import { parseTuningRequest, type TuningContext } from '$lib/server/claude';

/**
 * POST /api/tune
 * Accepts a natural language message, parses it into preference changes,
 * applies them, and returns Pip's response.
 *
 * Request body: { message: string }
 * Response: { response: string, changes: object }
 */
export const POST: RequestHandler = async ({ request }) => {
	try {
		const { message } = await request.json();

		if (!message || typeof message !== 'string' || message.trim().length === 0) {
			return json({ error: 'Message is required' }, { status: 400 });
		}

		// Load current preferences
		const prefs = await prisma.userPreferences.findUnique({
			where: { id: 'default' }
		});

		if (!prefs) {
			return json({ error: 'Preferences not initialized' }, { status: 500 });
		}

		// Load available sources (so Claude can match source names to IDs)
		const sources = await prisma.source.findMany({
			select: { id: true, name: true, category: true },
			where: { enabled: true },
			orderBy: { name: 'asc' }
		});

		// Load recent tuning history for conversation context
		const recentLogs = await prisma.tuningLog.findMany({
			orderBy: { createdAt: 'desc' },
			take: 5
		});

		const context: TuningContext = {
			currentPreferences: {
				interests: JSON.parse(prefs.interests),
				sourceWeights: JSON.parse(prefs.sourceWeights),
				moodBalance: prefs.moodBalance,
				preferLongForm: prefs.preferLongForm,
				preferVisual: prefs.preferVisual
			},
			availableSources: sources,
			recentTuning: recentLogs.reverse().map((log) => ({
				input: log.input,
				parsed: log.parsed,
				response: log.response
			}))
		};

		// Parse the tuning request
		const result = await parseTuningRequest(message.trim(), context);

		// Apply changes to preferences
		const updates: Record<string, unknown> = {};

		if (result.changes.interests !== undefined) {
			// Merge with existing interests
			const current = JSON.parse(prefs.interests) as Record<string, number>;
			for (const [topic, weight] of Object.entries(result.changes.interests)) {
				if (weight === 0) {
					delete current[topic];
				} else {
					current[topic] = weight;
				}
			}
			updates.interests = JSON.stringify(current);
		}

		if (result.changes.sourceWeights !== undefined) {
			// Merge with existing source weights
			const current = JSON.parse(prefs.sourceWeights) as Record<string, number>;
			for (const [sourceId, weight] of Object.entries(result.changes.sourceWeights)) {
				if (weight === 0) {
					delete current[sourceId];
				} else {
					current[sourceId] = weight;
				}
			}
			updates.sourceWeights = JSON.stringify(current);
		}

		if (result.changes.moodBalance !== undefined) {
			updates.moodBalance = Math.max(-1, Math.min(1, result.changes.moodBalance));
		}

		if (result.changes.preferLongForm !== undefined) {
			updates.preferLongForm = result.changes.preferLongForm;
		}

		if (result.changes.preferVisual !== undefined) {
			updates.preferVisual = result.changes.preferVisual;
		}

		// Update preferences if there are changes
		if (Object.keys(updates).length > 0) {
			await prisma.userPreferences.update({
				where: { id: 'default' },
				data: updates
			});
		}

		// Log the tuning interaction
		await prisma.tuningLog.create({
			data: {
				input: message.trim(),
				parsed: JSON.stringify(result.changes),
				response: result.response
			}
		});

		return json({
			response: result.response,
			changes: result.changes
		});
	} catch (error) {
		console.error('Error processing tuning request:', error);
		return json(
			{
				error: 'Failed to process tuning request',
				response: "Blimey, somethin' went wrong on me end, gov'nor. Give it another go?"
			},
			{ status: 500 }
		);
	}
};
