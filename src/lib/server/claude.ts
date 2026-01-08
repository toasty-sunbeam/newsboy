// Claude API integration for Pip's personality features
// - Daily briefing generation (Pip's top 3 picks in cockney voice)
// - Conversational tuning (future)

import Anthropic from '@anthropic-ai/sdk';
import type { Article } from '@prisma/client';

const apiKey = process.env.ANTHROPIC_API_KEY;

if (!apiKey) {
	throw new Error('ANTHROPIC_API_KEY environment variable is required');
}

const anthropic = new Anthropic({
	apiKey
});

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
		const response = await anthropic.messages.create({
			model: 'claude-haiku-4-20250131',
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
