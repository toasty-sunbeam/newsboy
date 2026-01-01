// Lightweight cron scheduler for nightly batch job
// Uses native JavaScript timers - no external dependencies needed

import { fetchAllFeeds } from './batch';

// Configuration
const BATCH_HOUR = 0; // Midnight (0-23)
const BATCH_MINUTE = 0; // Top of the hour (0-59)
const CHECK_INTERVAL_MS = 60 * 1000; // Check every minute

let cronStarted = false;
let lastRunDate: string | null = null;
let checkInterval: ReturnType<typeof setInterval> | null = null;

/**
 * Get today's date as YYYY-MM-DD string
 */
function getTodayString(): string {
	const now = new Date();
	return now.toISOString().split('T')[0];
}

/**
 * Check if it's time to run the batch job
 */
function shouldRunBatch(): boolean {
	const now = new Date();
	const hour = now.getHours();
	const minute = now.getMinutes();
	const today = getTodayString();

	// Already ran today
	if (lastRunDate === today) {
		return false;
	}

	// Check if it's the scheduled time (within the first minute)
	return hour === BATCH_HOUR && minute === BATCH_MINUTE;
}

/**
 * Run the batch job
 */
async function runBatch(): Promise<void> {
	const today = getTodayString();

	console.log(`\n🗞️  Pip's starting his rounds! (${new Date().toISOString()})`);

	try {
		await fetchAllFeeds();
		lastRunDate = today;
		console.log(`\n🗞️  All done! Pip's having a rest.`);
	} catch (error) {
		console.error(`\n❌ Batch job failed:`, error);
		// Don't update lastRunDate so it can retry next minute
	}
}

/**
 * Start the nightly batch cron scheduler
 * Safe to call multiple times - will only start once
 */
export function startNightlyBatch(): void {
	if (cronStarted) {
		console.log('📅 Cron scheduler already running');
		return;
	}

	cronStarted = true;

	console.log('📅 Starting nightly batch scheduler');
	console.log(`   Scheduled time: ${BATCH_HOUR.toString().padStart(2, '0')}:${BATCH_MINUTE.toString().padStart(2, '0')} daily`);

	// Check immediately on startup (in case server restarts after scheduled time)
	if (shouldRunBatch()) {
		console.log('📅 Batch time detected on startup, running now...');
		runBatch();
	} else {
		// Calculate time until next batch
		const now = new Date();
		const nextRun = new Date(now);
		nextRun.setHours(BATCH_HOUR, BATCH_MINUTE, 0, 0);
		if (nextRun <= now) {
			nextRun.setDate(nextRun.getDate() + 1);
		}
		const hoursUntil = Math.round((nextRun.getTime() - now.getTime()) / (1000 * 60 * 60) * 10) / 10;
		console.log(`   Next batch in ~${hoursUntil} hours`);
	}

	// Check every minute if it's time to run
	checkInterval = setInterval(() => {
		if (shouldRunBatch()) {
			runBatch();
		}
	}, CHECK_INTERVAL_MS);

	// Log that scheduler is active
	console.log('📅 Cron scheduler active');
}

/**
 * Stop the cron scheduler (useful for testing)
 */
export function stopNightlyBatch(): void {
	if (checkInterval) {
		clearInterval(checkInterval);
		checkInterval = null;
	}
	cronStarted = false;
	console.log('📅 Cron scheduler stopped');
}

/**
 * Manually trigger the batch job (for testing or manual runs)
 */
export async function triggerBatchNow(): Promise<void> {
	console.log('📅 Manual batch trigger requested');
	await runBatch();
}

/**
 * Get the current cron status
 */
export function getCronStatus(): {
	running: boolean;
	lastRunDate: string | null;
	scheduledTime: string;
} {
	return {
		running: cronStarted,
		lastRunDate,
		scheduledTime: `${BATCH_HOUR.toString().padStart(2, '0')}:${BATCH_MINUTE.toString().padStart(2, '0')}`
	};
}
