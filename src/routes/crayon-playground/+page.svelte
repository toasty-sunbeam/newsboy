<script lang="ts">
	import { onMount } from 'svelte';

	interface Article {
		id: string;
		title: string;
		source: { name: string };
	}

	// Available Replicate models for image generation
	const MODELS = [
		{
			id: 'stability-ai/stable-diffusion:db21e45d3f7023abc2a46ee38a23973f6dce16bb082a930b0c49861f96d1e5bf',
			name: 'Stable Diffusion 1.5 (current)',
			description: 'Fast, cheap (~$0.004/image)'
		},
		{
			id: 'stability-ai/sdxl:39ed52f2a78e934b3ba6e2a89f5b1c712de7dfea535525255b1aa35c5565e08b',
			name: 'SDXL 1.0',
			description: 'Higher quality, slower (~$0.01/image)'
		},
		{
			id: 'bytedance/sdxl-lightning-4step:5599ed30703defd1d160a25a63321b4dec97101d98b4674bcc56e41f62f35637',
			name: 'SDXL Lightning (4-step)',
			description: 'Fast SDXL variant'
		}
	];

	let articles: Article[] = $state([]);
	let loading = $state(true);
	let selectedArticle: Article | null = $state(null);
	let subject = $state('');
	let prompt = $state('');
	let negativePrompt = $state('realistic, photographic, detailed, professional, polished, clean lines, perfect, adult drawing, digital art, 3D render');
	let selectedModel = $state(MODELS[0].id);
	let generating = $state(false);
	let generatedImageUrl = $state('');
	let errorMessage = $state('');

	onMount(async () => {
		await loadArticles();
	});

	async function loadArticles() {
		try {
			loading = true;
			const response = await fetch('/api/feed');
			const data = await response.json();
			articles = data.articles || [];
		} catch (error) {
			console.error('Failed to load articles:', error);
			errorMessage = 'Failed to load articles';
		} finally {
			loading = false;
		}
	}

	function selectArticle(article: Article) {
		selectedArticle = article;
		subject = article.title
		prompt = buildPrompt(subject);
		generatedImageUrl = '';
		errorMessage = '';
	}

	function buildPrompt(subj: string): string {
		return `Simple childlike crayon sketch of "${subj}", few wobbly lines, mostly uncolored, messy scribbles, stick figures, white paper showing through, imperfect circles, like a 6 year old drew it quickly, not filled in`;
	}

	function updatePromptFromSubject() {
		prompt = buildPrompt(subject);
	}

	async function generateImage() {
		if (!selectedArticle) return;

		generating = true;
		generatedImageUrl = '';
		errorMessage = '';

		try {
			const response = await fetch('/api/crayon-generate', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					prompt,
					negativePrompt,
					model: selectedModel
				})
			});

			const data = await response.json();

			if (response.ok) {
				generatedImageUrl = data.imageUrl;
			} else {
				errorMessage = data.error || 'Failed to generate image';
			}
		} catch (error) {
			console.error('Failed to generate image:', error);
			errorMessage = 'Failed to generate image';
		} finally {
			generating = false;
		}
	}
</script>

<div class="min-h-screen bg-gradient-to-br from-purple-50 to-pink-100">
	<div class="container mx-auto px-4 py-8">
		<!-- Header -->
		<div class="mb-8">
			<a href="/" class="text-purple-700 hover:text-purple-900 mb-4 inline-block">← Back to Feed</a>
			<h1 class="text-4xl font-bold text-gray-800">🖍️ Crayon Drawing Playground</h1>
			<p class="text-gray-600 mt-2">
				Experiment with prompts and models to fine-tune Pip's crayon drawings
			</p>
		</div>

		<div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
			<!-- Article List -->
			<div class="lg:col-span-1">
				<div class="bg-white rounded-lg shadow-lg p-6 border-4 border-purple-200">
					<h2 class="text-xl font-bold text-gray-800 mb-4">Select an Article</h2>

					{#if loading}
						<p class="text-gray-500">Loading articles...</p>
					{:else if articles.length === 0}
						<p class="text-gray-500">No articles found. Try fetching feeds first!</p>
					{:else}
						<div class="space-y-2 max-h-[600px] overflow-y-auto">
							{#each articles as article (article.id)}
								<button
									onclick={() => selectArticle(article)}
									class="w-full text-left p-3 rounded-lg border-2 transition-colors {selectedArticle?.id === article.id
										? 'border-purple-500 bg-purple-50'
										: 'border-gray-200 hover:border-purple-300 bg-white'}"
								>
									<p class="font-medium text-sm text-gray-800 line-clamp-2">
										{article.title}
									</p>
									<p class="text-xs text-gray-500 mt-1">{article.source.name}</p>
								</button>
							{/each}
						</div>
					{/if}
				</div>
			</div>

			<!-- Generation Controls -->
			<div class="lg:col-span-2">
				{#if selectedArticle}
					<div class="bg-white rounded-lg shadow-lg p-6 border-4 border-pink-200">
						<h2 class="text-xl font-bold text-gray-800 mb-4">Generate Crayon Drawing</h2>

						<!-- Article Title -->
						<div class="mb-4 p-3 bg-gray-50 rounded-lg">
							<p class="text-sm font-semibold text-gray-600 mb-1">Article Title:</p>
							<p class="text-gray-800">{selectedArticle.title}</p>
						</div>

						<!-- Subject/Keywords -->
						<div class="mb-4">
							<label for="subject" class="block text-sm font-semibold text-gray-700 mb-2">
								Subject/Keywords
								<span class="font-normal text-gray-500">(extracted from title)</span>
							</label>
							<div class="flex gap-2">
								<input
									id="subject"
									bind:value={subject}
									class="flex-1 px-3 py-2 border-2 border-gray-300 rounded-lg focus:border-purple-500 focus:outline-none"
									placeholder="what to draw"
								/>
								<button
									onclick={updatePromptFromSubject}
									class="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-medium"
								>
									Update Prompt
								</button>
							</div>
						</div>

						<!-- Model Selection -->
						<div class="mb-4">
							<label for="model" class="block text-sm font-semibold text-gray-700 mb-2">
								Image Model
							</label>
							<select
								id="model"
								bind:value={selectedModel}
								class="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:border-purple-500 focus:outline-none"
							>
								{#each MODELS as model}
									<option value={model.id}>
										{model.name} — {model.description}
									</option>
								{/each}
							</select>
						</div>

						<!-- Prompt -->
						<div class="mb-4">
							<label for="prompt" class="block text-sm font-semibold text-gray-700 mb-2">
								Prompt
							</label>
							<textarea
								id="prompt"
								bind:value={prompt}
								rows="4"
								class="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:border-purple-500 focus:outline-none font-mono text-sm"
								placeholder="Describe what you want to generate..."
							></textarea>
						</div>

						<!-- Negative Prompt -->
						<div class="mb-6">
							<label for="negative-prompt" class="block text-sm font-semibold text-gray-700 mb-2">
								Negative Prompt
								<span class="font-normal text-gray-500">(what to avoid)</span>
							</label>
							<textarea
								id="negative-prompt"
								bind:value={negativePrompt}
								rows="2"
								class="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:border-purple-500 focus:outline-none font-mono text-sm"
								placeholder="What to avoid in the image..."
							></textarea>
						</div>

						<!-- Generate Button -->
						<button
							onclick={generateImage}
							disabled={generating}
							class="w-full px-6 py-3 bg-purple-500 text-white rounded-lg hover:bg-purple-600 font-bold text-lg disabled:opacity-50 disabled:cursor-not-allowed"
						>
							{generating ? '🖍️ Drawing...' : '🖍️ Generate Crayon Drawing'}
						</button>

						<!-- Error Message -->
						{#if errorMessage}
							<div class="mt-4 p-4 bg-red-50 border-2 border-red-200 rounded-lg text-red-800">
								❌ {errorMessage}
							</div>
						{/if}

						<!-- Generated Image -->
						{#if generatedImageUrl}
							<div class="mt-6">
								<h3 class="text-lg font-bold text-gray-800 mb-3">Generated Image:</h3>
								<div class="border-4 border-purple-200 rounded-lg overflow-hidden">
									<img
										src={generatedImageUrl}
										alt="Generated crayon drawing"
										class="w-full"
									/>
								</div>
								<div class="mt-2 text-sm text-gray-600">
									<a
										href={generatedImageUrl}
										target="_blank"
										rel="noopener noreferrer"
										class="text-purple-600 hover:text-purple-800 underline"
									>
										Open in new tab
									</a>
								</div>
							</div>
						{/if}
					</div>
				{:else}
					<div class="bg-white rounded-lg shadow-lg p-12 border-4 border-gray-200 text-center">
						<div class="text-6xl mb-4">🎨</div>
						<p class="text-xl text-gray-600">
							Select an article from the list to start experimenting!
						</p>
					</div>
				{/if}
			</div>
		</div>
	</div>
</div>

<style>
	.line-clamp-2 {
		display: -webkit-box;
		-webkit-line-clamp: 2;
		-webkit-box-orient: vertical;
		overflow: hidden;
	}
</style>
