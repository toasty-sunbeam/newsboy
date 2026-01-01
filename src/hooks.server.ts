// SvelteKit server hooks
// Initialize background jobs and scheduled tasks

import { startScheduler } from '$lib/server/cron';

// Start the nightly batch job scheduler when the server starts
startScheduler();

console.log('🗞️  Newsboy server initialized');
