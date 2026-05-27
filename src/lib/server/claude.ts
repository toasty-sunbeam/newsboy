// Claude API integration for Pip's personality features
// - Daily briefing generation (Pip's top 3 picks in cockney voice)
// - Conversational tuning (future)

import Anthropic from '@anthropic-ai/sdk';
import type { Article } from '@prisma/client';

let anthropic: Anthropic;

function getClient(): Anthropic {
	if (!anthropic) {
		const apiKey = process.env.ANTHROPIC_API_KEY;
		if (!apiKey) {
			throw new Error('ANTHROPIC_API_KEY environment variable is required');
		}
		anthropic = new Anthropic({ apiKey });
	}
	return anthropic;
}

export interface BriefingInput {
	title: string;
	excerpt?: string | null;
	url: string;
}

/**
 * Generate Pip's daily briefing for the top 3 articles
 * Uses Claude Haiku for cost efficiency
 */
export async function generateDailyBriefing(articles: BriefingInput[]): Promise<string> {
	if (articles.length === 0) {
		return "Blimey, gov'nor! I couldn't find any stories worth tellin' today. Check back tomorrow!";
	}

	// Take top 3 articles (or fewer if less available)
	const topArticles = articles.slice(0, 3);

	const articleSummaries = topArticles
		.map((article, index) => {
			const excerpt = article.excerpt ? `\nExcerpt: ${article.excerpt}` : '';
			return `Article ${index + 1}:\nTitle: ${article.title}${excerpt}\nURL: ${article.url}`;
		})
		.join('\n\n');

	const prompt = `You are Pip, a cheerful Victorian street urchin newsboy with a cockney accent. Your job is to greet your patron (the "gov'nor") and enthusiastically tell them about the top 3 stories you've collected today.

Here are the articles you've found:

${articleSummaries}

Write a brief daily briefing (3-5 sentences) in Pip's voice where you:
1. Greet the gov'nor warmly
2. Mention you've got some "crackin' stories" or similar
3. Briefly describe each of the ${topArticles.length} articles in your own words, making them sound interesting
4. Use cockney expressions and Victorian street urchin charm
5. Keep each article summary to 1-2 sentences maximum

Important guidelines for Pip's voice:
- Use cockney expressions like "blimey", "proper", "crackin'", "right nice", etc.
- Address the reader as "gov'nor"
- Be enthusiastic but not over-the-top
- Drop some 'h's and 'g's at the end of words naturally (e.g., "comin'", "tellin'")
- Sound like a helpful street kid who's proud of his work
- Be brief and punchy - this is a greeting, not an essay

Example tone (don't copy exactly):
"Mornin' gov'nor! Been out since dawn and found some proper good stories for ya! First up, them scientists in Switzerland made a robot what folds itself like origami—clever stuff, that! Then there's this bloke in Japan who 3D printed a whole house in 24 hours. And best of all, a pod of dolphins helped rescue a swimmer off New Zealand—right heartwarmin', that is!"

Now write your briefing:`;

	try {
		const response = await getClient().messages.create({
			model: 'claude-3-5-haiku-20241022',
			max_tokens: 300,
			temperature: 0.7,
			messages: [
				{
					role: 'user',
					content: prompt
				}
			]
		});

		const briefing = response.content[0].type === 'text' ? response.content[0].text : '';

		// Clean up any extra whitespace
		return briefing.trim();
	} catch (error) {
		console.error('Error generating briefing with Claude:', error);
		// Fallback to simple briefing if API fails
		return generateFallbackBriefing(topArticles);
	}
}

export interface TuningContext {
	currentPreferences: {
		interests: Record<string, number>;
		sourceWeights: Record<string, number>;
		moodBalance: number;
		preferLongForm: boolean;
		preferVisual: boolean;
	};
	availableSources: Array<{ id: string; name: string; category: string }>;
	recentTuning: Array<{ input: string; parsed: string; response: string }>;
}

export interface TuningResult {
	response: string;
	changes: {
		interests?: Record<string, number>;
		sourceWeights?: Record<string, number>;
		moodBalance?: number;
		preferLongForm?: boolean;
		preferVisual?: boolean;
	};
}

export async function parseTuningRequest(
	message: string,
	context: TuningContext
): Promise<TuningResult> {
	const sourceList = context.availableSources
		.map((s) => `  - "${s.name}" (id: ${s.id}, category: ${s.category})`)
		.join('\n');

	const recentHistory = context.recentTuning
		.map((t) => `User: "${t.input}"\nPip: "${t.response}"`)
		.join('\n\n');

	const prompt = `You are Pip, a cheerful Victorian street urchin newsboy who helps the gov'nor tune their news feed. The gov'nor has sent you a message asking to adjust their preferences.

Current preferences:
- Interests (topic -> weight 0-1): ${JSON.stringify(context.currentPreferences.interests)}
- Source weights (source id -> weight 0-2, 1=normal, 0=disabled): ${JSON.stringify(context.currentPreferences.sourceWeights)}
- Mood balance (-1=serious/gloomy, 0=balanced, 1=uplifting/joyful): ${context.currentPreferences.moodBalance}
- Prefer long-form articles: ${context.currentPreferences.preferLongForm}
- Prefer visual content: ${context.currentPreferences.preferVisual}

Available sources:
${sourceList || '  (none)'}

${recentHistory ? `Recent conversation:\n${recentHistory}\n` : ''}

Gov'nor's message: "${message}"

Respond with a JSON object in this exact format:
{
  "response": "<Pip's cockney reply acknowledging the changes, 1-3 sentences>",
  "changes": {
    "interests": { "<topic>": <weight 0-1> },
    "sourceWeights": { "<source id>": <weight 0-2> },
    "moodBalance": <number -1 to 1>,
    "preferLongForm": <boolean>,
    "preferVisual": <boolean>
  }
}

Only include fields in "changes" that actually need updating. Omit unchanged fields entirely. To remove an interest or source weight, set it to 0. Keep Pip's response in cockney Victorian newsboy voice.`;

	try {
		const response = await getClient().messages.create({
			model: 'claude-haiku-4-5-20251001',
			max_tokens: 400,
			temperature: 0.5,
			messages: [{ role: 'user', content: prompt }]
		});

		const text = response.content[0].type === 'text' ? response.content[0].text.trim() : '';
		const jsonMatch = text.match(/\{[\s\S]*\}/);
		if (!jsonMatch) throw new Error('No JSON in response');
		const parsed = JSON.parse(jsonMatch[0]) as TuningResult;
		return parsed;
	} catch (error) {
		console.error('Error parsing tuning request with Claude:', error);
		return {
			response:
				"Blimey, I 'ad trouble understandin' that one, gov'nor. Could ya say it different like?",
			changes: {}
		};
	}
}

/**
 * Fallback briefing if Claude API fails
 */
function generateFallbackBriefing(articles: BriefingInput[]): string {
	const count = articles.length;
	const storiesWord = count === 1 ? 'story' : 'stories';

	let briefing = `Mornin' gov'nor! I've got ${count} ${storiesWord} for ya today!\n\n`;

	articles.forEach((article, index) => {
		briefing += `${index === 0 ? 'First off' : index === 1 ? 'Then there\'s' : 'And finally'}, ${article.title}.\n\n`;
	});

	briefing += "That's the best of what I found! Have a read, gov'nor!";

	return briefing;
}
