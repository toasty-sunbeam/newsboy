<script lang="ts">
	import { onMount } from 'svelte';

	export let nextRevealHour: number | null = null;
	export let showMessage: boolean = true; // Control whether to show the message box

	type UnsplashImage = {
		imageUrl: string;
		photographer: string;
		photographerUrl: string;
		description: string;
		color: string;
	};

	let image: UnsplashImage | null = null;
	let loading = true;
	let error = '';

	function formatNextRevealTime(hour: number): string {
		const now = new Date();
		const revealTime = new Date();
		revealTime.setHours(hour, 0, 0, 0);

		// If the hour has passed today, it means tomorrow
		if (revealTime <= now) {
			revealTime.setDate(revealTime.getDate() + 1);
		}

		// Calculate minutes until reveal
		const diffMs = revealTime.getTime() - now.getTime();
		const diffMins = Math.ceil(diffMs / (1000 * 60));
		const diffHours = Math.floor(diffMins / 60);

		if (diffMins < 60) {
			return `about ${diffMins} minute${diffMins === 1 ? '' : 's'}`;
		} else if (diffHours < 24) {
			return `about ${diffHours} hour${diffHours === 1 ? '' : 's'}`;
		} else {
			return revealTime.toLocaleString([], {
				month: 'short',
				day: 'numeric',
				hour: 'numeric',
				minute: '2-digit'
			});
		}
	}

	function getTimeUntilTomorrow(): string {
		const now = new Date();
		const tomorrow = new Date();
		tomorrow.setDate(tomorrow.getDate() + 1);
		tomorrow.setHours(0, 0, 0, 0);

		const diffMs = tomorrow.getTime() - now.getTime();
		const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
		const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

		if (diffHours > 0) {
			return `${diffHours} hour${diffHours === 1 ? '' : 's'} and ${diffMins} minute${diffMins === 1 ? '' : 's'}`;
		} else {
			return `${diffMins} minute${diffMins === 1 ? '' : 's'}`;
		}
	}

	onMount(async () => {
		try {
			const response = await fetch('/api/unsplash');
			const data = await response.json();

			if (response.ok) {
				image = data;
			} else {
				error = data.error || 'Failed to load calming image';
			}
		} catch (err) {
			error = 'Failed to connect to server';
			console.error('Error loading Unsplash image:', err);
		} finally {
			loading = false;
		}
	});
</script>

<div class="caught-up-container">
	{#if loading}
		<!-- Loading state -->
		<div class="gradient-background">
			<div class="loading-overlay">
				<div class="text-6xl mb-4">✨</div>
				<p class="text-xl text-white italic">Loading a calming view...</p>
			</div>
		</div>
	{:else if error}
		<!-- Error fallback - show gradient background -->
		<div class="gradient-background">
			<div class="photo-credit-error">Beautiful view coming soon...</div>
		</div>
	{:else if image}
		<!-- Beautiful Unsplash image background - full visibility, no overlay message -->
		<div
			class="image-background"
			style="background-image: url('{image.imageUrl}'); background-color: {image.color};"
		>
			<!-- Subtle gradient for photo credit readability -->
			<div class="subtle-overlay"></div>

			<!-- Photo credit -->
			<div class="photo-credit">
				Photo by
				<a
					href="{image.photographerUrl}?utm_source=newsboy&utm_medium=referral"
					target="_blank"
					rel="noopener noreferrer"
					class="photographer-link"
				>
					{image.photographer}
				</a>
				on
				<a
					href="https://unsplash.com?utm_source=newsboy&utm_medium=referral"
					target="_blank"
					rel="noopener noreferrer"
					class="unsplash-link"
				>
					Unsplash
				</a>
			</div>
		</div>
	{/if}
</div>

<style>
	.caught-up-container {
		min-height: 60vh;
		position: relative;
		overflow: hidden;
	}

	.image-background {
		position: absolute;
		inset: 0;
		background-size: cover;
		background-position: center;
		background-repeat: no-repeat;
	}

	.gradient-background {
		position: absolute;
		inset: 0;
		background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
	}

	.subtle-overlay {
		position: absolute;
		inset: 0;
		background: linear-gradient(to bottom, rgba(0, 0, 0, 0), rgba(0, 0, 0, 0.2));
	}

	.loading-overlay {
		position: relative;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		min-height: 60vh;
		z-index: 10;
	}

	.photo-credit {
		position: absolute;
		bottom: 1rem;
		right: 1rem;
		color: rgba(255, 255, 255, 0.95);
		font-size: 0.875rem;
		text-shadow: 0 2px 4px rgba(0, 0, 0, 0.8);
		z-index: 20;
	}

	.photo-credit-error {
		position: absolute;
		bottom: 1rem;
		right: 1rem;
		color: rgba(255, 255, 255, 0.7);
		font-size: 0.875rem;
		font-style: italic;
		z-index: 20;
	}

	.photographer-link,
	.unsplash-link {
		color: rgba(255, 255, 255, 0.95);
		text-decoration: underline;
		font-weight: 600;
		transition: color 0.2s;
	}

	.photographer-link:hover,
	.unsplash-link:hover {
		color: #fbbf24;
	}
</style>
