#!/usr/bin/env bun
// Database checking utility
// Usage: bun run src/lib/server/db-check.ts [articles|sources|all]

import { prisma } from './db';

type CheckType = 'articles' | 'sources' | 'all';

async function checkArticles(limit: number = 5) {
	console.log(`\n📰 Recent Articles (last ${limit}):`);
	const articles = await prisma.article.findMany({
		take: limit,
		orderBy: { fetchedAt: 'desc' },
		select: {
			id: true,
			title: true,
			url: true,
			source: { select: { name: true } },
			fetchedAt: true
		}
	});

	if (articles.length === 0) {
		console.log('   (no articles found)');
		return;
	}

	articles.forEach((article) => {
		console.log(`\n   Source: ${article.source.name}`);
		console.log(`   Title: "${article.title}"`);
		console.log(`   URL: ${article.url}`);
		console.log(`   Fetched: ${article.fetchedAt.toLocaleString()}`);
	});
}

async function checkSources() {
	console.log('\n📚 Sources:');
	const sources = await prisma.source.findMany({
		select: {
			id: true,
			name: true,
			feedUrl: true,
			category: true,
			enabled: true,
			_count: { select: { articles: true } }
		},
		orderBy: { name: 'asc' }
	});

	if (sources.length === 0) {
		console.log('   (no sources found)');
		return;
	}

	sources.forEach((source) => {
		console.log(`\n   Name: "${source.name}"`);
		console.log(`   Category: ${source.category}`);
		console.log(`   Status: ${source.enabled ? '✅ enabled' : '❌ disabled'}`);
		console.log(`   Articles: ${source._count.articles}`);
		console.log(`   Feed: ${source.feedUrl}`);
	});
}

async function checkAll() {
	console.log('=== Newsboy Database Check ===');
	console.log(`Time: ${new Date().toISOString()}`);

	const totalArticles = await prisma.article.count();
	const totalSources = await prisma.source.count();

	console.log(`\n📊 Summary:`);
	console.log(`   Total sources: ${totalSources}`);
	console.log(`   Total articles: ${totalArticles}`);

	await checkSources();
	await checkArticles();

	console.log('\n=== End Database Check ===\n');
}

// Main entry point
async function main() {
	const checkType = (process.argv[2] || 'all').toLowerCase() as CheckType;

	try {
		switch (checkType) {
			case 'articles':
				await checkArticles();
				break;
			case 'sources':
				await checkSources();
				break;
			case 'all':
				await checkAll();
				break;
			default:
				console.error(`Unknown check type: ${checkType}`);
				console.error('Valid options: articles, sources, all');
				process.exit(1);
		}
	} catch (error) {
		console.error('Database check failed:', error);
		process.exit(1);
	}
}

if (import.meta.main) {
	main();
}

export { checkArticles, checkSources, checkAll };
