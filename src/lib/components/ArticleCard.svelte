<script lang="ts">
	import type { Article, Source } from '@prisma/client';

	export let article: Article & { source: Source };

	// Calculate reading time display
	const readTime = article.readingTimeMinutes
		? `${article.readingTimeMinutes} min read`
		: '';

	// Determine which image to use
	const imageUrl = article.heroImageUrl || article.crayonImageUrl;

	// Format published date
	const publishedDate = article.publishedAt
		? new Date(article.publishedAt).toLocaleDateString('en-US', {
			month: 'short',
			day: 'numeric',
			year: 'numeric'
		})
		: '';

	// Parse topics from JSON string
	let topics: string[] = [];
	if (article.topics) {
		try {
			topics = JSON.parse(article.topics);
		} catch {
			topics = [];
		}
	}
</script>

<a
	href={article.url}
	target="_blank"
	rel="noopener noreferrer"
	class="block bg-white rounded-lg shadow-md hover:shadow-xl transition-shadow duration-200 overflow-hidden group"
>
	<!-- Image section -->
	{#if imageUrl}
		<div class="relative overflow-hidden">
			<img
				src={imageUrl}
				alt={article.title}
				class="w-full h-64 object-cover group-hover:scale-105 transition-transform duration-200"
			/>

			<!-- Crayon attribution if using Pip's drawing -->
			{#if article.crayonImageUrl && !article.heroImageUrl}
				<div class="absolute bottom-2 right-2 bg-black bg-opacity-60 text-white text-xs px-2 py-1 rounded">
					✏️ Drawn by Pip
				</div>
			{/if}

			<!-- Content type badge (for webcomics) -->
			{#if article.contentType === 'webcomic'}
				<div class="absolute top-2 left-2 bg-purple-500 text-white text-xs font-bold px-2 py-1 rounded">
					COMIC
				</div>
			{/if}
		</div>
	{/if}

	<!-- Content section -->
	<div class="p-4">
		<!-- Source and date -->
		<div class="flex items-center justify-between mb-2 text-sm text-gray-500">
			<span class="font-medium text-amber-600">{article.source.name}</span>
			{#if publishedDate}
				<span>{publishedDate}</span>
			{/if}
		</div>

		<!-- Title -->
		<h2 class="text-xl font-bold text-gray-800 mb-2 line-clamp-3 group-hover:text-amber-600 transition-colors">
			{article.title}
		</h2>

		<!-- Excerpt -->
		{#if article.excerpt}
			<p class="text-gray-600 text-sm line-clamp-3 mb-3">
				{article.excerpt}
			</p>
		{/if}

		<!-- Footer: topics and reading time -->
		<div class="flex items-center justify-between text-sm">
			<div class="flex flex-wrap gap-1">
				{#each topics.slice(0, 2) as topic}
					<span class="bg-gray-100 text-gray-600 px-2 py-1 rounded text-xs">
						{topic}
					</span>
				{/each}
			</div>
			{#if readTime}
				<span class="text-gray-500">{readTime}</span>
			{/if}
		</div>
	</div>
</a>

<style>
	/* Tailwind's line-clamp utilities */
	.line-clamp-3 {
		display: -webkit-box;
		-webkit-line-clamp: 3;
		-webkit-box-orient: vertical;
		overflow: hidden;
	}
</style>
