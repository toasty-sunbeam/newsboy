<script lang="ts">
	let name = 'gov\'nor';
</script>

<div class="min-h-screen bg-gradient-to-br from-amber-50 to-orange-100">
	<div class="container mx-auto px-4 py-16">
		<div class="max-w-2xl mx-auto text-center">
			<!-- Pip's greeting -->
			<div class="mb-8">
				<div class="flex justify-between items-center mb-4">
					<h1 class="text-6xl font-bold text-gray-800">
						🗞️ Newsboy
					</h1>
					<a
						href="/settings"
						class="px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 font-medium"
					>
						⚙️ Settings
					</a>
				</div>
				<div class="bg-white rounded-lg shadow-lg p-8 border-4 border-amber-200">
					<p class="text-2xl text-gray-700 mb-4 font-serif italic">
						"Mornin' {name}! I'm Pip, your newsboy!"
					</p>
					<p class="text-lg text-gray-600">
						Right then, let's get you set up proper-like. We'll have yer personalized news ready in no time!
					</p>
				</div>
			</div>

			<!-- Setup status -->
			<div class="bg-white rounded-lg shadow-md p-6 text-left space-y-4">
				<h2 class="text-2xl font-bold text-gray-800 mb-4">Setup Status</h2>

				<div class="flex items-center space-x-3">
					<span class="text-2xl">✅</span>
					<span class="text-gray-700">SvelteKit initialized</span>
				</div>

				<div class="flex items-center space-x-3">
					<span class="text-2xl">✅</span>
					<span class="text-gray-700">Prisma schema created</span>
				</div>

				<div class="flex items-center space-x-3">
					<span class="text-2xl">✅</span>
					<span class="text-gray-700">Tailwind CSS configured</span>
				</div>

				<div class="flex items-center space-x-3">
					<span class="text-2xl">✅</span>
					<span class="text-gray-700">Category-based feed management</span>
				</div>

				<div class="flex items-center space-x-3 bg-amber-50 p-3 rounded-lg border-2 border-amber-200">
					<span class="text-2xl">📥</span>
					<div class="flex-1">
						<span class="text-gray-700 font-semibold">Ready to add feeds!</span>
						<p class="text-sm text-gray-600 mt-1">
							Go to <a href="/settings" class="text-amber-600 hover:text-amber-700 font-semibold">Settings</a> to create categories and paste RSS URLs
						</p>
					</div>
				</div>
			</div>

			<!-- What's next -->
			<div class="mt-8 bg-blue-50 rounded-lg p-6 border-2 border-blue-200">
				<h3 class="text-xl font-bold text-gray-800 mb-3">What's Next?</h3>
				<ul class="text-left space-y-2 text-gray-700">
					<li>• <a href="/settings" class="text-amber-600 hover:text-amber-700 font-semibold">Add your RSS feeds by category</a></li>
					<li>• Implement RSS fetching and article storage</li>
					<li>• Build the feed UI</li>
					<li>• Set up the nightly batch job</li>
				</ul>
			</div>
		</div>
	</div>
</div>
