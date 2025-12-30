<script lang="ts">
	import { onMount } from 'svelte';

	interface Source {
		id: string;
		name: string;
		feedUrl: string;
		siteUrl: string | null;
		contentType: string;
		enabled: boolean;
	}

	let sources: Source[] = $state([]);
	let uploading = $state(false);
	let uploadMessage = $state('');
	let uploadError = $state('');
	let fileInput: HTMLInputElement;

	onMount(async () => {
		await loadSources();
	});

	async function loadSources() {
		try {
			const response = await fetch('/api/sources');
			const data = await response.json();
			sources = data.sources;
		} catch (error) {
			console.error('Failed to load sources:', error);
		}
	}

	async function handleFileUpload(event: Event) {
		const target = event.target as HTMLInputElement;
		const file = target.files?.[0];

		if (!file) return;

		uploading = true;
		uploadMessage = '';
		uploadError = '';

		try {
			const formData = new FormData();
			formData.append('opml', file);

			const response = await fetch('/api/sources/import', {
				method: 'POST',
				body: formData
			});

			const data = await response.json();

			if (response.ok) {
				uploadMessage = data.message;
				await loadSources();
				// Clear file input
				if (fileInput) fileInput.value = '';
			} else {
				uploadError = data.error || 'Failed to import OPML';
			}
		} catch (error) {
			uploadError = 'Failed to upload file';
			console.error('Upload error:', error);
		} finally {
			uploading = false;
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
</script>

<div class="min-h-screen bg-gradient-to-br from-amber-50 to-orange-100">
	<div class="container mx-auto px-4 py-8">
		<!-- Header -->
		<div class="mb-8">
			<a href="/" class="text-amber-700 hover:text-amber-900 mb-4 inline-block">← Back to Feed</a>
			<h1 class="text-4xl font-bold text-gray-800">Settings</h1>
			<p class="text-gray-600 mt-2 font-serif italic">"Let's get yer news sources sorted, gov'nor!"</p>
		</div>

		<!-- OPML Import Section -->
		<div class="bg-white rounded-lg shadow-lg p-6 mb-8 border-4 border-amber-200">
			<h2 class="text-2xl font-bold text-gray-800 mb-4">Import RSS Feeds (OPML)</h2>
			<p class="text-gray-600 mb-4">
				Upload an OPML file from your RSS reader (FreshRSS, Feedly, etc.) to import your feeds.
			</p>

			<div class="space-y-4">
				<div>
					<input
						bind:this={fileInput}
						type="file"
						accept=".opml,.xml"
						onchange={handleFileUpload}
						disabled={uploading}
						class="block w-full text-sm text-gray-700 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-amber-500 file:text-white hover:file:bg-amber-600 disabled:opacity-50"
					/>
				</div>

				{#if uploading}
					<div class="text-blue-600 font-medium">Uploading and importing feeds...</div>
				{/if}

				{#if uploadMessage}
					<div class="bg-green-50 border-2 border-green-200 rounded-lg p-4 text-green-800">
						✅ {uploadMessage}
					</div>
				{/if}

				{#if uploadError}
					<div class="bg-red-50 border-2 border-red-200 rounded-lg p-4 text-red-800">
						❌ {uploadError}
					</div>
				{/if}
			</div>
		</div>

		<!-- Sources List -->
		<div class="bg-white rounded-lg shadow-lg p-6 border-4 border-amber-200">
			<h2 class="text-2xl font-bold text-gray-800 mb-4">
				Your Sources ({sources.length})
			</h2>

			{#if sources.length === 0}
				<div class="text-center py-8 text-gray-500">
					<p class="text-lg">No feeds yet, gov'nor!</p>
					<p class="text-sm mt-2">Upload an OPML file above to get started.</p>
				</div>
			{:else}
				<div class="space-y-2">
					{#each sources as source (source.id)}
						<div
							class="flex items-center justify-between p-4 rounded-lg border-2 {source.enabled
								? 'border-gray-200 bg-white'
								: 'border-gray-100 bg-gray-50 opacity-60'}"
						>
							<div class="flex-1">
								<div class="flex items-center gap-2">
									<h3 class="font-semibold text-gray-800">{source.name}</h3>
									<span
										class="text-xs px-2 py-1 rounded-full {source.contentType === 'webcomic'
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
		</div>
	</div>
</div>
