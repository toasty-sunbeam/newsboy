// SvelteKit server hooks
// This file runs when the server starts

// Load environment variables from .env into process.env during dev/start
import 'dotenv/config';

import { startNightlyBatch } from '$lib/server/cron';
import { prisma } from '$lib/server/db';

// Initialize database (ensure default preferences exist)
async function initDatabase() {
	try {
		console.log('[DB] Checking database initialization...');

		// Ensure default preferences exist
		const existingPrefs = await prisma.userPreferences.findUnique({
			where: { id: 'default' }
		});

		if (!existingPrefs) {
			console.log('[DB] Creating default user preferences...');
			await prisma.userPreferences.create({
				data: {
					id: 'default',
					interests: '{}',
					sourceWeights: '{}',
					moodBalance: 0,
					preferLongForm: false,
					preferVisual: true
				}
			});
			console.log('[DB] ✅ Default preferences created');
		} else {
			console.log('[DB] ✅ Default preferences already exist');
		}
	} catch (error) {
		console.error('[DB] ⚠️  Error initializing database:', error);
		console.error('[DB] The app may not work correctly. Run: bunx prisma db push');
	}
}

// Initialize database on startup
initDatabase();

// Start the nightly batch cron scheduler
// This runs the RSS fetching job at midnight daily
startNightlyBatch();

// Optional: Add request handling hooks here if needed
// export const handle: Handle = async ({ event, resolve }) => {
// 	return resolve(event);
// };
