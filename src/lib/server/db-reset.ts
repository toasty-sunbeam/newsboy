#!/usr/bin/env bun
// Database reset utility for testing
// Usage: bun run src/lib/server/db-reset.ts [articles|sources|all]
//
// WARNING: This permanently deletes data. Use with caution in development only.

import { prisma } from './db';

type ResetType = 'articles' | 'sources' | 'all';

async function confirmReset(type: ResetType): Promise<boolean> {
	const warnings: Record<ResetType, string> = {
		articles: 'Delete ALL articles (but keep sources)?',
		sources: 'Delete ALL sources and articles?',
		all: 'Delete ALL sources and articles?'
	};

	console.warn('\n⚠️  WARNING: This will permanently delete data!');
	console.warn(`${warnings[type]}`);
	console.warn('This action cannot be undone.\n');

	// In a CLI environment, we just warn and proceed
	// In production, you'd want interactive confirmation
	return true;
}

async function resetArticles() {
	if (!(await confirmReset('articles'))) {
		console.log('Reset cancelled.');
		return;
	}

	console.log('Deleting all articles...');
	const result = await prisma.article.deleteMany();
	console.log(`✅ Deleted ${result.count} articles`);
}

async function resetSources() {
	if (!(await confirmReset('sources'))) {
		console.log('Reset cancelled.');
		return;
	}

	console.log('Deleting all sources (and their articles)...');
	const result = await prisma.source.deleteMany();
	console.log(`✅ Deleted ${result.count} sources`);
}

async function resetAll() {
	if (!(await confirmReset('all'))) {
		console.log('Reset cancelled.');
		return;
	}

	console.log('Deleting all sources and articles...');
	const sourcesResult = await prisma.source.deleteMany();
	console.log(`✅ Deleted ${sourcesResult.count} sources`);
}

async function main() {
	const resetType = (process.argv[2] || 'articles').toLowerCase() as ResetType;

	try {
		switch (resetType) {
			case 'articles':
				await resetArticles();
				break;
			case 'sources':
				await resetSources();
				break;
			case 'all':
				await resetAll();
				break;
			default:
				console.error(`Unknown reset type: ${resetType}`);
				console.error('Valid options: articles, sources, all');
				process.exit(1);
		}
	} catch (error) {
		console.error('Reset failed:', error);
		process.exit(1);
	}
}

if (import.meta.main) {
	main();
}

export { resetArticles, resetSources, resetAll };
