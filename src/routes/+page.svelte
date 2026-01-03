<script lang="ts">
	import { onMount } from 'svelte';
	import ArticleCard from '$lib/components/ArticleCard.svelte';
	import CaughtUp from '$lib/components/CaughtUp.svelte';
	import type { Article, Source } from '@prisma/client';

	type ArticleWithSource = Article & { source: Source };

	type DripStatus = {
		enabled: boolean;
		totalForToday?: number;
		revealedCount?: number;
		remainingCount?: number;
		currentHour?: number;
		nextRevealHour?: number | null;
		nextRevealCount?: number;
		message?: string;
	};

	let articles: ArticleWithSource[] = [];
	let drip: DripStatus | null = null;
	let loading = true;
	let error = '';
	let isCaughtUp = false;
	let headerImageUrl = '';
	let headerImagePhotographer = '';
	let headerImagePhotoUrl = '';

	function formatNextRevealTime(hour: number): string {
		const now = new Date();
		const revealTime = new Date();
		revealTime.setHours(hour, 0, 0, 0);

		// If the hour has passed today, it means tomorrow (shouldn't happen with drip logic)
		if (revealTime <= now) {
			revealTime.setDate(revealTime.getDate() + 1);
		}

		// Calculate minutes until reveal
		const diffMs = revealTime.getTime() - now.getTime();
		const diffMins = Math.ceil(diffMs / (1000 * 60));

		if (diffMins < 60) {
			return `about ${diffMins} minute${diffMins === 1 ? '' : 's'}`;
		}

		// Format as time
		return revealTime.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
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
			// Check if we're in test mode
			const urlParams = new URLSearchParams(window.location.search);
			const testMode = urlParams.get('test');

			const apiUrl = testMode ? `/api/feed?test=${testMode}` : '/api/feed';
			const response = await fetch(apiUrl);
			const data = await response.json();

			if (response.ok) {
				articles = data.articles;
				drip = data.drip || null;

				// Check if user is caught up (has articles and no more remaining)
				isCaughtUp =
					articles.length > 0 && drip?.enabled && drip.remainingCount !== undefined && drip.remainingCount === 0;

				// Debug logging
				console.log('Feed loaded:', {
					articlesCount: articles.length,
					drip,
					isCaughtUp
				});
			} else {
				error = data.error || 'Failed to load articles';
			}

			// Fetch header image
			try {
				const imageResponse = await fetch('/api/unsplash');
				if (imageResponse.ok) {
					const imageData = await imageResponse.json();
					headerImageUrl = imageData.imageUrl;
					headerImagePhotographer = imageData.photographer;
					headerImagePhotoUrl = imageData.photoUrl;
				}
			} catch (err) {
				console.error('Failed to load header image:', err);
			}
		} catch (err) {
			error = 'Failed to connect to server';
			console.error('Error loading feed:', err);
		} finally {
			loading = false;
		}
	});
</script>

<div class="min-h-screen bg-gradient-to-br from-amber-50 to-orange-100">
	<!-- Header -->
	<header class="bg-white shadow-md">
		<div class="container mx-auto px-4 py-4">
			<div class="flex items-center justify-between">
				<div class="flex items-center space-x-3">
					<h1 class="text-4xl font-bold text-gray-800">
						🗞️ Newsboy
					</h1>
					<span class="text-gray-500 italic">with Pip</span>
				</div>
				<nav class="flex items-center space-x-4">
					<a
						href="/settings"
						class="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-medium transition-colors"
					>
						⚙️ Settings
					</a>
				</nav>
			</div>
		</div>

		<!-- Header Image -->
		{#if headerImageUrl && !loading}
			<div class="header-image-container">
				<div
					class="header-image"
					style="background-image: url('{headerImageUrl}');"
				></div>
				{#if headerImagePhotographer && headerImagePhotoUrl}
					<div class="header-photo-credit">
						Photo by
						<a
							href={headerImagePhotoUrl}
							target="_blank"
							rel="noopener noreferrer"
							class="header-photographer-link"
						>
							{headerImagePhotographer}
						</a>
					</div>
				{/if}
			</div>
		{/if}
	</header>

	<!-- Main content -->
	<main class="container mx-auto px-4 py-8">
		{#if loading}
			<!-- Loading state -->
			<div class="flex flex-col items-center justify-center py-20">
				<div class="text-6xl mb-4">🗞️</div>
				<p class="text-xl text-gray-600 italic">
					"Pip's fetchin' the news for ya, gov'nor..."
				</p>
			</div>
		{:else if error}
			<!-- Error state -->
			<div class="max-w-2xl mx-auto">
				<div class="bg-red-50 border-2 border-red-200 rounded-lg p-6 text-center">
					<p class="text-xl text-red-600 mb-2">❌ {error}</p>
					<p class="text-gray-600">
						Try refreshing the page or check your settings.
					</p>
				</div>
			</div>
		{:else if articles.length === 0}
			<!-- Empty state - no articles yet -->
			<div class="max-w-2xl mx-auto">
				<div class="bg-white rounded-lg shadow-lg p-8 border-4 border-amber-200 text-center">
					<div class="text-6xl mb-4">📰</div>
					<p class="text-2xl text-gray-700 mb-4 font-serif italic">
						"Blimey, gov'nor! I ain't got no news yet!"
					</p>
					<p class="text-lg text-gray-600 mb-6">
						Looks like you haven't added any feeds or fetched articles yet.
					</p>
					<div class="space-y-3 text-left bg-amber-50 p-6 rounded-lg">
						<p class="font-semibold text-gray-800">Here's what to do:</p>
						<ol class="list-decimal list-inside space-y-2 text-gray-700">
							<li>
								Go to <a href="/settings" class="text-amber-600 hover:text-amber-700 font-semibold">Settings</a>
								and add some RSS feeds
							</li>
							<li>
								Run the batch job to fetch articles:
								<code class="bg-gray-100 px-2 py-1 rounded text-sm">bun run batch</code>
							</li>
							<li>Come back here to see your personalized feed!</li>
						</ol>
					</div>
				</div>

				<!-- Debug info -->
				{#if drip}
					<div class="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-4 text-left text-sm">
						<p class="font-semibold mb-2">Debug Info:</p>
						<pre class="text-xs overflow-auto">{JSON.stringify({ drip, isCaughtUp }, null, 2)}</pre>
					</div>
				{/if}
			</div>
		{:else}
			<!-- Feed with articles -->
			<!-- Debug info (top of feed) -->
			<div class="mb-4 bg-blue-50 border border-blue-200 rounded-lg p-4 text-left text-sm">
				<p class="font-semibold mb-2">🔍 Debug Info:</p>
				<pre class="text-xs overflow-auto">{JSON.stringify(
					{
						articlesCount: articles.length,
						drip,
						isCaughtUp,
						testUrl: '/?test=caughtup'
					},
					null,
					2
				)}</pre>
			</div>

			<div class="mb-6">
				<div class="bg-white rounded-lg shadow-md p-4 border-l-4 border-amber-500">
					<p class="text-lg text-gray-700 italic">
						{#if drip?.enabled && drip.remainingCount && drip.remainingCount > 0}
							"Mornin' gov'nor! I've got <strong>{articles.length}</strong>
							{articles.length === 1 ? 'story' : 'stories'} ready for ya, with
							<strong>{drip.remainingCount}</strong> more comin' later!"
						{:else}
							"Mornin' gov'nor! I've got <strong>{articles.length}</strong>
							{articles.length === 1 ? 'story' : 'stories'} for ya today!"
						{/if}
					</p>
				</div>
			</div>

			<!-- Drip status indicator -->
			{#if drip?.enabled && drip.remainingCount && drip.remainingCount > 0 && drip.nextRevealHour !== null}
				<div class="mb-6">
					<div class="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-center justify-center gap-2 text-amber-800">
						<span class="text-lg">⏰</span>
						<span class="text-sm">
							{drip.nextRevealCount}
							{drip.nextRevealCount === 1 ? 'story' : 'stories'} comin' in
							{formatNextRevealTime(drip.nextRevealHour)}
						</span>
					</div>
				</div>
			{/if}

			<!-- Two-column masonry layout -->
			<!-- Mobile: single column -->
			<div class="md:hidden space-y-6">
				{#each articles as article (article.id)}
					<ArticleCard {article} />
				{/each}
			</div>

			<!-- Desktop: two independent columns -->
			<div class="hidden md:flex gap-6">
				<!-- Left column (even indices) -->
				<div class="flex-1 space-y-6">
					{#each articles.filter((_, i) => i % 2 === 0) as article (article.id)}
						<ArticleCard {article} />
					{/each}
				</div>
				<!-- Right column (odd indices) -->
				<div class="flex-1 space-y-6">
					{#each articles.filter((_, i) => i % 2 === 1) as article (article.id)}
						<ArticleCard {article} />
					{/each}
				</div>
			</div>

		{/if}
	</main>

	<!-- Footer message and calming image - always shown when articles exist -->
	{#if !loading && !error && articles.length > 0}
		<!-- Pip's message -->
		<div class="container mx-auto px-4 pb-8">
			<div class="text-center">
				<div class="inline-block bg-white rounded-lg shadow-md p-6 border-2 border-amber-200">
					<p class="text-2xl text-gray-700 italic mb-3 font-serif">
						"That's all for now, gov'nor! Have yourself a rest."
					</p>
					{#if isCaughtUp}
						<!-- All done for today - next batch is tomorrow -->
						<p class="text-sm text-gray-500">
							I'll be back with fresh news in {getTimeUntilTomorrow()}
						</p>
					{:else if drip?.enabled && drip.remainingCount && drip.remainingCount > 0 && drip.nextRevealHour !== null}
						<!-- More coming later today -->
						<p class="text-sm text-gray-500">
							I'll be back with more stories in {formatNextRevealTime(drip.nextRevealHour)}
						</p>
					{:else}
						<!-- Fallback -->
						<p class="text-sm text-gray-500">
							Check back soon for more!
						</p>
					{/if}
				</div>
			</div>
		</div>

		<!-- Calming Unsplash image - full width, always shown -->
		<div class="full-width-image-container">
			<CaughtUp nextRevealHour={drip?.nextRevealHour || null} />
		</div>
	{/if}
</div>

<style>
	/* Header image */
	.header-image-container {
		width: 100%;
		height: 200px;
		overflow: hidden;
		position: relative;
	}

	.header-image {
		width: 100%;
		height: 100%;
		background-size: cover;
		background-position: center;
		background-repeat: no-repeat;
	}

	.header-photo-credit {
		position: absolute;
		bottom: 0.5rem;
		right: 0.5rem;
		color: rgba(255, 255, 255, 0.95);
		font-size: 0.75rem;
		text-shadow: 0 2px 4px rgba(0, 0, 0, 0.8);
		z-index: 10;
	}

	.header-photographer-link {
		color: rgba(255, 255, 255, 0.95);
		text-decoration: underline;
		font-weight: 600;
		transition: color 0.2s;
	}

	.header-photographer-link:hover {
		color: #fbbf24;
	}

	/* Full width image container for caught-up state */
	.full-width-image-container {
		width: 100%;
		margin-top: 2rem;
	}

	/* Larger header image on desktop */
	@media (min-width: 768px) {
		.header-image-container {
			height: 300px;
		}
	}
</style>
