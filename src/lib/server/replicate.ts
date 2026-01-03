// Crayon drawing generation via Replicate API (Stable Diffusion 1.5)
// Pip draws illustrations for articles without images

import Replicate from 'replicate';

// Check for API token
if (!process.env.REPLICATE_API_TOKEN) {
	console.warn('⚠️  REPLICATE_API_TOKEN not set. Crayon drawing generation will be skipped.');
}

const replicate = new Replicate({
	auth: process.env.REPLICATE_API_TOKEN || ''
});

/**
 * Generate a childlike crayon drawing for an article
 * @param title - Article title to base the drawing on
 * @returns URL of the generated image, or null if generation failed
 */
export async function generateCrayonDrawing(title: string): Promise<string | null> {
	// Skip if no API token
	if (!process.env.REPLICATE_API_TOKEN) {
		console.log('   ⚠️  Skipping crayon drawing (no REPLICATE_API_TOKEN)');
		return null;
	}

	try {
		// Extract key subject from title for the drawing
		const subject = extractSubjectFromTitle(title);

		// Craft a prompt for a childlike crayon drawing
		const prompt = buildCrayonPrompt(subject);

		console.log(`   🖍️  Generating crayon drawing: "${subject}"`);


		// Call Replicate API with Stable Diffusion 1.5
		const output = await replicate.run(
			"stability-ai/stable-diffusion:db21e45d3f7023abc2a46ee38a23973f6dce16bb082a930b0c49861f96d1e5bf",
			{
				input: {
					prompt: prompt,
					negative_prompt: "realistic, photographic, detailed, professional, polished, clean lines, perfect, adult drawing, digital art, 3D render",
					width: 512,
					height: 512,
					num_inference_steps: 25,
					guidance_scale: 7.5,
					scheduler: "K_EULER"
				}
			}
		);

		// Extract the image URL from the output
		const imageUrl = Array.isArray(output) ? output[0] : output;

		if (typeof imageUrl === 'string') {
			console.log(`   ✅ Crayon drawing generated successfully`);
			return imageUrl;
		}

		console.error('   ❌ Unexpected output format from Replicate');
		return null;

	} catch (error) {
		console.error('   ❌ Error generating crayon drawing:', error instanceof Error ? error.message : error);
		return null;
	}
}

/**
 * Extract a drawable subject from the article title
 * Simplifies complex headlines into something a child might draw
 */
function extractSubjectFromTitle(title: string): string {
	// Remove common article prefixes
	let cleaned = title
		.replace(/^(The|A|An)\s+/i, '')
		.replace(/['"]/g, '')
		.trim();

	// Try to extract the core subject (first few words or key phrase)
	// Keep it simple - children draw simple things
	const words = cleaned.split(' ');

	// If title is short, use it all
	if (words.length <= 5) {
		return cleaned.toLowerCase();
	}

	// Otherwise, take first 4-5 words or up to first punctuation
	const truncated = words.slice(0, 5).join(' ');
	const punctuationIndex = truncated.search(/[:.;,]/);

	if (punctuationIndex > 0) {
		return truncated.substring(0, punctuationIndex).toLowerCase();
	}

	return truncated.toLowerCase();
}

/**
 * Build a prompt for a childlike crayon drawing
 */
function buildCrayonPrompt(subject: string): string {
	return `Childlike crayon drawing of ${subject}, wobbly lines, bright vibrant colors, simple shapes, rough sketch, hand-drawn by a child, on cream paper, innocent and charming, like a Victorian street kid's drawing`;
}
