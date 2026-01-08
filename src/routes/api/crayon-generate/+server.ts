// API endpoint for custom crayon drawing generation (playground)
// Note: This endpoint works regardless of CRAYON_GENERATION_ENABLED flag
// so you can experiment even when automatic generation is disabled
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import Replicate from 'replicate';

const replicate = new Replicate({
	auth: process.env.REPLICATE_API_TOKEN || ''
});

export const POST: RequestHandler = async ({ request }) => {
	const token = process.env.REPLICATE_API_TOKEN;
	const enabled = process.env.CRAYON_GENERATION_ENABLED === 'true';

	if (!token) {
		return json(
			{ error: 'REPLICATE_API_TOKEN not configured' },
			{ status: 500 }
		);
	}

	// Log if main feature is disabled but playground is being used
	if (!enabled) {
		console.log('ℹ️  Playground generation active (main feature disabled, but playground still works)');
	}

	try {
		const { prompt, negativePrompt, model } = await request.json();

		if (!prompt) {
			return json(
				{ error: 'Prompt is required' },
				{ status: 400 }
			);
		}

		console.log(`🎨 Generating image with custom settings:`);
		console.log(`   Model: ${model}`);
		console.log(`   Prompt: ${prompt.substring(0, 100)}...`);

		// Call Replicate API with custom settings
		const output = await replicate.run(
			model,
			{
				input: {
					prompt: prompt,
					negative_prompt: negativePrompt || '',
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
			console.log(`   ✅ Image generated successfully`);
			return json({ imageUrl });
		}

		console.error('   ❌ Unexpected output format from Replicate');
		return json(
			{ error: 'Unexpected output format from Replicate' },
			{ status: 500 }
		);

	} catch (error) {
		const errorMessage = error instanceof Error ? error.message : String(error);
		console.error(`   ❌ Error generating image: ${errorMessage}`);

		return json(
			{ error: errorMessage },
			{ status: 500 }
		);
	}
};
