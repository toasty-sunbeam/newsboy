// Simple cron-like scheduler for nightly batch jobs
// Runs the batch job at midnight (00:00) every day

import { runBatchJob } from './batch';

let isRunning = false;
let schedulerInterval: Timer | null = null;

/**
 * Start the nightly batch job scheduler
 */
export function startScheduler() {
	if (isRunning) {
		console.log('⏰ Scheduler already running');
		return;
	}

	console.log('🗞️  Starting Newsboy batch job scheduler...');
	console.log('   Jobs will run at midnight (00:00) every day');

	isRunning = true;

	// Check every minute if it's midnight
	schedulerInterval = setInterval(async () => {
		const now = new Date();
		const hours = now.getHours();
		const minutes = now.getMinutes();

		// Run at midnight (00:00)
		if (hours === 0 && minutes === 0) {
			console.log('\n⏰ Midnight! Running nightly batch job...');
			try {
				await runBatchJob();
				console.log('✅ Nightly batch job completed\n');
			} catch (error) {
				console.error('❌ Nightly batch job failed:', error);
			}
		}
	}, 60000); // Check every minute

	// Log next scheduled run
	const now = new Date();
	const nextRun = new Date(now);
	nextRun.setHours(24, 0, 0, 0); // Next midnight

	console.log(`   Next run scheduled for: ${nextRun.toLocaleString()}`);
}

/**
 * Stop the scheduler
 */
export function stopScheduler() {
	if (schedulerInterval) {
		clearInterval(schedulerInterval);
		schedulerInterval = null;
		isRunning = false;
		console.log('⏰ Scheduler stopped');
	}
}

/**
 * Run the batch job immediately (for testing)
 */
export async function runNow() {
	console.log('🗞️  Running batch job immediately...');
	try {
		await runBatchJob();
		console.log('✅ Batch job completed');
	} catch (error) {
		console.error('❌ Batch job failed:', error);
		throw error;
	}
}
