// SvelteKit server hooks
// This file runs when the server starts

// Load environment variables from .env into process.env during dev/start
import 'dotenv/config';

import { startNightlyBatch } from '$lib/server/cron';

// Start the nightly batch cron scheduler
// This runs the RSS fetching job at midnight daily
startNightlyBatch();

// Optional: Add request handling hooks here if needed
// export const handle: Handle = async ({ event, resolve }) => {
// 	return resolve(event);
// };
