<script lang="ts">
	import type { Article, Source } from '@prisma/client';

	export let briefing: {
		id: string;
		date: string;
		pipSummary: string;
		generatedAt: string;
		featuredArticles: (Article & { source: Source })[];
	};

	// Format the date nicely
	const briefingDate = new Date(briefing.date).toLocaleDateString('en-US', {
		weekday: 'long',
		month: 'long',
		day: 'numeric',
		year: 'numeric'
	});
</script>

<div class="bg-white rounded-lg shadow-xl overflow-hidden border-4 border-amber-400">
	<!-- Header with Pip's character -->
	<div class="bg-gradient-to-r from-amber-500 to-orange-500 px-6 py-4 text-white">
		<div class="flex items-center gap-3">
			<div class="text-4xl">🗞️</div>
			<div>
				<h2 class="text-2xl font-bold">Pip's Daily Briefing</h2>
				<p class="text-sm text-amber-100">{briefingDate}</p>
			</div>
		</div>
	</div>

	<!-- Pip's summary -->
	<div class="p-6 bg-amber-50">
		<div class="prose prose-lg max-w-none">
			<!-- Split into paragraphs for better formatting -->
			{#each briefing.pipSummary.split('\n\n') as paragraph}
				{#if paragraph.trim()}
					<p class="text-gray-800 leading-relaxed mb-3 font-serif italic">
						{paragraph}
					</p>
				{/if}
			{/each}
		</div>
	</div>

	<!-- Featured articles list -->
	{#if briefing.featuredArticles && briefing.featuredArticles.length > 0}
		<div class="p-6 border-t-2 border-amber-200 bg-white">
			<h3 class="text-lg font-bold text-gray-700 mb-4">📰 Featured Stories:</h3>
			<div class="space-y-3">
				{#each briefing.featuredArticles as article, index}
					<a
						href={article.url}
						target="_blank"
						rel="noopener noreferrer"
						class="block p-3 rounded-lg border border-gray-200 hover:border-amber-400 hover:bg-amber-50 transition-all duration-200 group"
					>
						<div class="flex items-start gap-3">
							<div class="flex-shrink-0 w-8 h-8 rounded-full bg-amber-400 text-white font-bold flex items-center justify-center text-sm">
								{index + 1}
							</div>
							<div class="flex-1 min-w-0">
								<h4 class="font-semibold text-gray-800 group-hover:text-amber-600 transition-colors line-clamp-2">
									{article.title}
								</h4>
								<p class="text-sm text-gray-500 mt-1">
									{article.source.name}
								</p>
							</div>
							<div class="flex-shrink-0 text-gray-400 group-hover:text-amber-500 transition-colors">
								<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
								</svg>
							</div>
						</div>
					</a>
				{/each}
			</div>
		</div>
	{/if}

	<!-- Footer with vintage newspaper styling -->
	<div class="px-6 py-3 bg-gradient-to-r from-gray-100 to-gray-50 border-t border-gray-200">
		<p class="text-xs text-gray-500 text-center italic">
			"Extra! Extra! Read all about it!" — Pip, your faithful newsboy
		</p>
	</div>
</div>

<style>
	.line-clamp-2 {
		display: -webkit-box;
		-webkit-line-clamp: 2;
		-webkit-box-orient: vertical;
		overflow: hidden;
	}

	.prose p:last-child {
		margin-bottom: 0;
	}
</style>
