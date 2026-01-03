<script lang="ts">
	import { onMount } from 'svelte';

	export let nextRevealHour: number | null = null;

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
		<div class="message-overlay">
			<div class="message-card loading-card">
				<div class="text-6xl mb-4">✨</div>
				<p class="text-xl text-gray-600 italic">Loading a calming view...</p>
			</div>
		</div>
	{:else if error}
		<!-- Error fallback - still show the message but with a gentle gradient background -->
		<div class="gradient-background">
			<div class="message-overlay">
				<div class="message-card">
					<div class="text-8xl mb-6">🌅</div>
					<p class="pip-message">"That's the lot of it, gov'nor! Have yourself a rest."</p>
					{#if nextRevealHour !== null}
						<p class="next-reveal-text">
							I'll be back with more stories in {formatNextRevealTime(nextRevealHour)}.
						</p>
					{:else}
						<p class="next-reveal-text">Check back tomorrow for fresh news!</p>
					{/if}
				</div>
			</div>
		</div>
	{:else if image}
		<!-- Beautiful Unsplash image background -->
		<div
			class="image-background"
			style="background-image: url('{image.imageUrl}'); background-color: {image.color};"
		>
			<!-- Overlay to make text readable -->
			<div class="image-overlay"></div>

			<!-- Message content -->
			<div class="message-overlay">
				<div class="message-card">
					<div class="text-8xl mb-6">🗞️</div>
					<p class="pip-message">"That's the lot of it, gov'nor! Have yourself a rest."</p>
					{#if nextRevealHour !== null}
						<p class="next-reveal-text">
							I'll be back with more stories in {formatNextRevealTime(nextRevealHour)}.
						</p>
					{:else}
						<p class="next-reveal-text">Check back tomorrow for fresh news!</p>
					{/if}
				</div>

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
		</div>
	{/if}
</div>

<style>
	.caught-up-container {
		min-height: 70vh;
		position: relative;
		border-radius: 1rem;
		overflow: hidden;
		box-shadow: 0 10px 40px rgba(0, 0, 0, 0.1);
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

	.image-overlay {
		position: absolute;
		inset: 0;
		background: linear-gradient(to bottom, rgba(0, 0, 0, 0.3), rgba(0, 0, 0, 0.5));
	}

	.message-overlay {
		position: relative;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		min-height: 70vh;
		padding: 2rem;
		z-index: 10;
	}

	.message-card {
		background: rgba(255, 255, 255, 0.95);
		backdrop-filter: blur(10px);
		padding: 3rem 2.5rem;
		border-radius: 1.5rem;
		box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
		text-align: center;
		max-width: 600px;
		border: 3px solid rgba(251, 191, 36, 0.5);
	}

	.loading-card {
		border-color: rgba(156, 163, 175, 0.3);
	}

	.pip-message {
		font-size: 2rem;
		font-style: italic;
		color: #374151;
		margin-bottom: 1.5rem;
		font-family: Georgia, serif;
		line-height: 1.4;
	}

	.next-reveal-text {
		font-size: 1.125rem;
		color: #6b7280;
		margin-top: 1rem;
	}

	.photo-credit {
		position: absolute;
		bottom: 1rem;
		right: 1rem;
		color: rgba(255, 255, 255, 0.9);
		font-size: 0.875rem;
		text-shadow: 0 1px 3px rgba(0, 0, 0, 0.5);
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

	/* Responsive adjustments */
	@media (max-width: 640px) {
		.message-card {
			padding: 2rem 1.5rem;
		}

		.pip-message {
			font-size: 1.5rem;
		}

		.next-reveal-text {
			font-size: 1rem;
		}
	}
</style>
