<script lang="ts">
	import { onMount } from 'svelte';

	interface Source {
		id: string;
		name: string;
		feedUrl: string;
		siteUrl: string | null;
		category: string;
		contentType: string;
		enabled: boolean;
	}

	interface CategoryGroup {
		name: string;
		feeds: Source[];
		newFeedsText: string;
		isAdding: boolean;
	}

	interface UserPreferences {
		id: string;
		interests: Record<string, number>;
		sourceWeights: Record<string, number>;
		moodBalance: number;
		preferLongForm: boolean;
		preferVisual: boolean;
		updatedAt: string;
	}

	let categories: CategoryGroup[] = $state([]);
	let newCategoryName = $state('');
	let isCreatingCategory = $state(false);
	let loading = $state(true);
	let message = $state('');
	let messageType: 'success' | 'error' = $state('success');
	let isRegenerating = $state(false);
	let isFetchingFeeds = $state(false);
	let isGeneratingCrayons = $state(false);
	let preferences: UserPreferences | null = $state(null);
	let loadingPreferences = $state(true);

	const DEFAULT_CATEGORIES = ['News', 'Webcomics', 'Science', 'Tech', 'Other'];

	onMount(async () => {
		await Promise.all([loadSources(), loadPreferences()]);
	});

	async function loadSources() {
		try {
			loading = true;
			const response = await fetch('/api/sources');
			const data = await response.json();
			const sources: Source[] = data.sources;

			// Group sources by category
			const categoryMap = new Map<string, Source[]>();

			sources.forEach((source) => {
				const cat = source.category || 'Uncategorized';
				if (!categoryMap.has(cat)) {
					categoryMap.set(cat, []);
				}
				categoryMap.get(cat)!.push(source);
			});

			// Convert to CategoryGroup array
			categories = Array.from(categoryMap.entries()).map(([name, feeds]) => ({
				name,
				feeds,
				newFeedsText: '',
				isAdding: false
			}));

			// Sort categories
			categories.sort((a, b) => a.name.localeCompare(b.name));
		} catch (error) {
			console.error('Failed to load sources:', error);
			showMessage('Failed to load feeds', 'error');
		} finally {
			loading = false;
		}
	}

	async function loadPreferences() {
		try {
			loadingPreferences = true;
			const response = await fetch('/api/preferences');
			const data = await response.json();

			if (response.ok) {
				preferences = data;
			} else {
				console.error('Failed to load preferences:', data.error);
			}
		} catch (error) {
			console.error('Failed to load preferences:', error);
		} finally {
			loadingPreferences = false;
		}
	}

	async function createCategory() {
		if (!newCategoryName.trim()) return;

		const categoryExists = categories.some(
			(cat) => cat.name.toLowerCase() === newCategoryName.trim().toLowerCase()
		);

		if (categoryExists) {
			showMessage('Category already exists', 'error');
			return;
		}

		categories.push({
			name: newCategoryName.trim(),
			feeds: [],
			newFeedsText: '',
			isAdding: true
		});

		categories.sort((a, b) => a.name.localeCompare(b.name));
		newCategoryName = '';
		isCreatingCategory = false;
	}

	async function addFeedsToCategory(category: CategoryGroup) {
		const urls = category.newFeedsText
			.split('\n')
			.map((line) => line.trim())
			.filter((line) => line && line.startsWith('http'));

		if (urls.length === 0) {
			showMessage('No valid URLs found', 'error');
			return;
		}

		try {
			const response = await fetch('/api/sources/bulk', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					urls,
					category: category.name
				})
			});

			const data = await response.json();

			if (response.ok) {
				showMessage(
					`Added ${data.added} feeds, skipped ${data.skipped} duplicates`,
					'success'
				);
				category.newFeedsText = '';
				category.isAdding = false;
				await loadSources();
			} else {
				showMessage(data.error || 'Failed to add feeds', 'error');
			}
		} catch (error) {
			console.error('Failed to add feeds:', error);
			showMessage('Failed to add feeds', 'error');
		}
	}

	async function toggleSource(source: Source) {
		try {
			const response = await fetch(`/api/sources/${source.id}`, {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ enabled: !source.enabled })
			});

			if (response.ok) {
				await loadSources();
			}
		} catch (error) {
			console.error('Failed to toggle source:', error);
		}
	}

	async function deleteSource(source: Source) {
		if (!confirm(`Delete "${source.name}"?`)) return;

		try {
			const response = await fetch(`/api/sources/${source.id}`, {
				method: 'DELETE'
			});

			if (response.ok) {
				await loadSources();
			}
		} catch (error) {
			console.error('Failed to delete source:', error);
		}
	}

	function showMessage(text: string, type: 'success' | 'error') {
		message = text;
		messageType = type;
		setTimeout(() => {
			message = '';
		}, 5000);
	}

	async function regenerateFeed() {
		isRegenerating = true;
		try {
			const response = await fetch('/api/batch?regenerate=true', { method: 'POST' });
			const data = await response.json();

			if (response.ok) {
				showMessage(data.message, 'success');
				// Also generate crayons for the regenerated feed
				await generateCrayons();
			} else {
				showMessage(data.message || 'Failed to regenerate feed', 'error');
			}
		} catch (error) {
			console.error('Failed to regenerate feed:', error);
			showMessage('Failed to regenerate feed', 'error');
		} finally {
			isRegenerating = false;
		}
	}

	async function fetchFeeds() {
		isFetchingFeeds = true;
		try {
			const response = await fetch('/api/batch', { method: 'POST' });
			const data = await response.json();

			if (response.ok) {
				showMessage(data.message, 'success');
				// Also generate crayons for any new articles
				await generateCrayons();
			} else {
				showMessage(data.message || 'Failed to fetch feeds', 'error');
			}
		} catch (error) {
			console.error('Failed to fetch feeds:', error);
			showMessage('Failed to fetch feeds', 'error');
		} finally {
			isFetchingFeeds = false;
		}
	}

	async function generateCrayons() {
		isGeneratingCrayons = true;
		try {
			const response = await fetch('/api/batch?crayons=true', { method: 'POST' });
			const data = await response.json();

			if (response.ok) {
				showMessage(data.message, 'success');
			} else {
				showMessage(data.message || 'Failed to generate crayon drawings', 'error');
			}
		} catch (error) {
			console.error('Failed to generate crayons:', error);
			showMessage('Failed to generate crayon drawings', 'error');
		} finally {
			isGeneratingCrayons = false;
		}
	}
</script>

<div class="min-h-screen bg-gradient-to-br from-amber-50 to-orange-100">
	<div class="container mx-auto px-4 py-8">
		<!-- Header -->
		<div class="mb-8">
			<div class="flex items-center justify-between mb-4">
				<a href="/" class="text-amber-700 hover:text-amber-900 inline-block">← Back to Feed</a>
				<a href="/crayon-playground" class="text-purple-700 hover:text-purple-900 inline-block">
					🖍️ Crayon Playground →
				</a>
			</div>
			<h1 class="text-4xl font-bold text-gray-800">Feed Settings</h1>
			<p class="text-gray-600 mt-2 font-serif italic">
				"Right then, let's get yer feeds sorted by category, gov'nor!"
			</p>
		</div>

		<!-- Messages -->
		{#if message}
			<div
				class="mb-6 p-4 rounded-lg border-2 {messageType === 'success'
					? 'bg-green-50 border-green-200 text-green-800'
					: 'bg-red-50 border-red-200 text-red-800'}"
			>
				{messageType === 'success' ? '✅' : '❌'}
				{message}
			</div>
		{/if}

		<!-- Feed Actions -->
		<div class="mb-8 bg-white rounded-lg shadow-lg p-6 border-4 border-green-200">
			<h2 class="text-xl font-bold text-gray-800 mb-4">Feed Actions</h2>
			<div class="flex flex-wrap gap-4">
				<button
					onclick={regenerateFeed}
					disabled={isRegenerating}
					class="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
				>
					{isRegenerating ? '🔄 Regenerating...' : '🔄 Regenerate Today\'s Feed'}
				</button>
				<button
					onclick={fetchFeeds}
					disabled={isFetchingFeeds}
					class="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
				>
					{isFetchingFeeds ? '📰 Fetching...' : '📰 Fetch New Articles'}
				</button>
				<button
					onclick={generateCrayons}
					disabled={isGeneratingCrayons}
					class="px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
				>
					{isGeneratingCrayons ? '🖍️ Drawing...' : '🖍️ Generate Crayon Drawings'}
				</button>
			</div>
			<p class="text-sm text-gray-500 mt-3">
				<strong>Regenerate:</strong> Clears today's feed and picks new articles from what's already fetched, then generates crayon drawings.<br />
				<strong>Fetch:</strong> Downloads new articles from all your RSS feeds, creates today's feed, then generates crayon drawings.<br />
				<strong>Generate Crayons:</strong> Creates Pip's hand-drawn illustrations for articles without images (uses Replicate API).
			</p>
		</div>

		<!-- User Preferences -->
		<div class="mb-8 bg-white rounded-lg shadow-lg p-6 border-4 border-purple-200">
			<h2 class="text-xl font-bold text-gray-800 mb-4">Your Preferences</h2>

			{#if loadingPreferences}
				<div class="text-gray-600">Loading preferences...</div>
			{:else if preferences}
				<div class="space-y-4">
					<!-- Mood Balance -->
					<div class="p-4 bg-purple-50 rounded-lg border-2 border-purple-100">
						<h3 class="font-semibold text-gray-700 mb-2">Mood Balance</h3>
						<div class="flex items-center gap-4">
							<span class="text-sm text-gray-600">Serious</span>
							<div class="flex-1 bg-gray-200 rounded-full h-2 relative">
								<div
									class="absolute h-2 rounded-full bg-purple-500"
									style="width: {((preferences.moodBalance + 1) / 2) * 100}%; transition: width 0.3s;"
								></div>
							</div>
							<span class="text-sm text-gray-600">Uplifting</span>
							<span class="text-lg font-bold text-purple-700 min-w-[3rem] text-right">
								{preferences.moodBalance.toFixed(1)}
							</span>
						</div>
					</div>

					<!-- Format Preferences -->
					<div class="p-4 bg-blue-50 rounded-lg border-2 border-blue-100">
						<h3 class="font-semibold text-gray-700 mb-2">Format Preferences</h3>
						<div class="space-y-2">
							<div class="flex items-center gap-2">
								<span class="text-2xl">{preferences.preferLongForm ? '✅' : '❌'}</span>
								<span class="text-gray-700">Prefer long-form content</span>
							</div>
							<div class="flex items-center gap-2">
								<span class="text-2xl">{preferences.preferVisual ? '✅' : '❌'}</span>
								<span class="text-gray-700">Prefer visual content</span>
							</div>
						</div>
					</div>

					<!-- Interests -->
					<div class="p-4 bg-amber-50 rounded-lg border-2 border-amber-100">
						<h3 class="font-semibold text-gray-700 mb-3">Topic Interests</h3>
						{#if Object.keys(preferences.interests).length > 0}
							<div class="space-y-2">
								{#each Object.entries(preferences.interests) as [topic, weight]}
									<div class="flex items-center gap-3">
										<span class="flex-1 text-gray-800">{topic}</span>
										<div class="flex-1 bg-gray-200 rounded-full h-2 relative max-w-xs">
											<div
												class="absolute h-2 rounded-full bg-amber-500"
												style="width: {weight * 100}%; transition: width 0.3s;"
											></div>
										</div>
										<span class="text-sm font-semibold text-amber-700 min-w-[3rem] text-right">
											{weight.toFixed(1)}
										</span>
									</div>
								{/each}
							</div>
						{:else}
							<p class="text-gray-500 italic">No specific interests set yet</p>
						{/if}
					</div>

					<!-- Source Weights -->
					<div class="p-4 bg-green-50 rounded-lg border-2 border-green-100">
						<h3 class="font-semibold text-gray-700 mb-3">Source Weights</h3>
						{#if Object.keys(preferences.sourceWeights).length > 0}
							<div class="space-y-2">
								{#each Object.entries(preferences.sourceWeights) as [sourceId, weight]}
									<div class="flex items-center gap-3">
										<span class="flex-1 text-gray-800 font-mono text-sm truncate">{sourceId}</span>
										<div class="flex-1 bg-gray-200 rounded-full h-2 relative max-w-xs">
											<div
												class="absolute h-2 rounded-full {weight > 0 ? 'bg-green-500' : 'bg-red-500'}"
												style="width: {Math.abs(weight) * 100}%; transition: width 0.3s;"
											></div>
										</div>
										<span class="text-sm font-semibold {weight > 0 ? 'text-green-700' : 'text-red-700'} min-w-[3rem] text-right">
											{weight > 0 ? '+' : ''}{weight.toFixed(1)}
										</span>
									</div>
								{/each}
							</div>
						{:else}
							<p class="text-gray-500 italic">No source weights configured</p>
						{/if}
					</div>

					<!-- Last Updated -->
					<div class="text-sm text-gray-500 text-right">
						Last updated: {new Date(preferences.updatedAt).toLocaleString()}
					</div>
				</div>
			{:else}
				<div class="text-gray-600">No preferences found</div>
			{/if}
		</div>

		<!-- Loading State -->
		{#if loading}
			<div class="text-center py-12 text-gray-600">Loading feeds...</div>
		{:else}
			<!-- Categories -->
			<div class="space-y-6">
				{#each categories as category (category.name)}
					<div class="bg-white rounded-lg shadow-lg p-6 border-4 border-amber-200">
						<h2 class="text-2xl font-bold text-gray-800 mb-4">
							{category.name}
							<span class="text-sm font-normal text-gray-500">
								({category.feeds.length} feeds)
							</span>
						</h2>

						<!-- Existing Feeds -->
						{#if category.feeds.length > 0}
							<div class="space-y-2 mb-4">
								{#each category.feeds as source (source.id)}
									<div
										class="flex items-center justify-between p-3 rounded-lg border-2 {source.enabled
											? 'border-gray-200 bg-white'
											: 'border-gray-100 bg-gray-50 opacity-60'}"
									>
										<div class="flex-1">
											<div class="flex items-center gap-2">
												<h3 class="font-semibold text-gray-800">{source.name}</h3>
												<span
													class="text-xs px-2 py-1 rounded-full {source.contentType ===
													'webcomic'
														? 'bg-purple-100 text-purple-700'
														: 'bg-blue-100 text-blue-700'}"
												>
													{source.contentType}
												</span>
											</div>
											<p class="text-sm text-gray-500 truncate mt-1">{source.feedUrl}</p>
										</div>

										<div class="flex items-center gap-2 ml-4">
											<button
												onclick={() => toggleSource(source)}
												class="px-3 py-1 rounded-lg text-sm font-medium {source.enabled
													? 'bg-amber-100 text-amber-700 hover:bg-amber-200'
													: 'bg-green-100 text-green-700 hover:bg-green-200'}"
											>
												{source.enabled ? 'Disable' : 'Enable'}
											</button>
											<button
												onclick={() => deleteSource(source)}
												class="px-3 py-1 rounded-lg text-sm font-medium bg-red-100 text-red-700 hover:bg-red-200"
											>
												Delete
											</button>
										</div>
									</div>
								{/each}
							</div>
						{/if}

						<!-- Add Feeds Section -->
						{#if category.isAdding}
							<div class="bg-amber-50 p-4 rounded-lg border-2 border-amber-200">
								<label for="feeds-input-{category.name}" class="block text-sm font-semibold text-gray-700 mb-2">
									Paste RSS feed URLs (one per line):
								</label>
								<textarea
									id="feeds-input-{category.name}"
									bind:value={category.newFeedsText}
									placeholder="https://example.com/feed.xml&#10;https://another.com/rss"
									rows="6"
									class="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:border-amber-500 focus:outline-none font-mono text-sm"
								></textarea>
								<div class="flex gap-2 mt-3">
									<button
										onclick={() => addFeedsToCategory(category)}
										class="px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 font-medium"
									>
										Add Feeds
									</button>
									<button
										onclick={() => (category.isAdding = false)}
										class="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 font-medium"
									>
										Cancel
									</button>
								</div>
							</div>
						{:else}
							<button
								onclick={() => (category.isAdding = true)}
								class="text-amber-600 hover:text-amber-700 font-medium text-sm"
							>
								+ Add feeds to this category
							</button>
						{/if}
					</div>
				{/each}

				<!-- Create New Category -->
				<div class="bg-white rounded-lg shadow-lg p-6 border-4 border-blue-200">
					<h2 class="text-xl font-bold text-gray-800 mb-4">Create New Category</h2>

					{#if isCreatingCategory}
						<div class="flex gap-2">
							<input
								bind:value={newCategoryName}
								placeholder="Category name (e.g., Politics, Gaming)"
								class="flex-1 px-3 py-2 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none"
								onkeydown={(e) => e.key === 'Enter' && createCategory()}
							/>
							<button
								onclick={createCategory}
								class="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 font-medium"
							>
								Create
							</button>
							<button
								onclick={() => (isCreatingCategory = false)}
								class="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 font-medium"
							>
								Cancel
							</button>
						</div>
					{:else}
						<button
							onclick={() => (isCreatingCategory = true)}
							class="text-blue-600 hover:text-blue-700 font-medium"
						>
							+ Create a new category
						</button>
					{/if}

					<div class="mt-4 text-sm text-gray-600">
						<p class="font-semibold mb-2">Suggested categories:</p>
						<div class="flex flex-wrap gap-2">
							{#each DEFAULT_CATEGORIES as suggestion}
								<button
									onclick={() => {
										newCategoryName = suggestion;
										isCreatingCategory = true;
									}}
									class="px-3 py-1 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-sm"
								>
									{suggestion}
								</button>
							{/each}
						</div>
					</div>
				</div>
			</div>
		{/if}
	</div>
</div>
