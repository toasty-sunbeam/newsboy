<script lang="ts">
	import { onMount } from 'svelte';
	import ArticleCard from '$lib/components/ArticleCard.svelte';
	import type { Article, Source } from '@prisma/client';

	type ArticleWithSource = Article & { source: Source };

	let articles: ArticleWithSource[] = [];
	let loading = true;
	let error = '';

	onMount(async () => {
		try {
			const response = await fetch('/api/feed');
			const data = await response.json();

			if (response.ok) {
				articles = data.articles;
			} else {
				error = data.error || 'Failed to load articles';
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
			</div>
		{:else}
			<!-- Feed with articles -->
			<div class="mb-6">
				<div class="bg-white rounded-lg shadow-md p-4 border-l-4 border-amber-500">
					<p class="text-lg text-gray-700 italic">
						"Mornin' gov'nor! I've got <strong>{articles.length}</strong>
						{articles.length === 1 ? 'story' : 'stories'} for ya today!"
					</p>
				</div>
			</div>

			<!-- Two-column masonry grid -->
			<div class="grid grid-cols-1 md:grid-cols-2 gap-6 auto-rows-auto">
				{#each articles as article (article.id)}
					<div class="break-inside-avoid">
						<ArticleCard {article} />
					</div>
				{/each}
			</div>

			<!-- Footer message -->
			<div class="mt-12 text-center">
				<div class="inline-block bg-white rounded-lg shadow-md p-6 border-2 border-amber-200">
					<p class="text-lg text-gray-700 italic">
						"That's the lot of it, gov'nor! Have yourself a rest."
					</p>
				</div>
			</div>
		{/if}
	</main>
</div>

<style>
	/* Ensure masonry-like behavior on larger screens */
	@media (min-width: 768px) {
		.grid {
			grid-auto-flow: dense;
		}
	}
</style>
