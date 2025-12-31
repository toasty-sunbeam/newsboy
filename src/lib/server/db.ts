// Database client - Prisma wrapper
// Prisma 7: Use libsql adapter for Bun compatibility

import { PrismaClient } from '@prisma/client';
import { PrismaLibSql } from '@prisma/adapter-libsql';
import { createClient } from '@libsql/client';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const globalForPrisma = globalThis as unknown as {
	prisma: PrismaClient | undefined;
};

// Get current directory for resolving relative paths
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Create libSQL client for local SQLite file
const databaseUrl = process.env.DATABASE_URL || 'file:newsboy.db';

// Convert file: URLs to proper format for libsql
let libsqlUrl: string;
if (databaseUrl.startsWith('file:')) {
	// Extract the path after 'file:'
	let filePath = databaseUrl.replace(/^file:/, '');

	// Remove ./ prefix if present
	filePath = filePath.replace(/^\.\//, '');

	// Convert to absolute path (relative to project root, not current file)
	const projectRoot = path.resolve(__dirname, '../../..');
	const absolutePath = path.isAbsolute(filePath) ? filePath : path.resolve(projectRoot, filePath);

	// libsql expects file:/// for absolute paths
	// On Unix: file:///home/user/path
	// On Windows: file:///C:/path
	const normalizedPath = absolutePath.replace(/\\/g, '/');
	libsqlUrl = normalizedPath.startsWith('/')
		? `file://${normalizedPath}`
		: `file:///${normalizedPath}`;

	console.log('[Prisma] Database URL:', libsqlUrl);
} else {
	// Remote URL (e.g., Turso)
	libsqlUrl = databaseUrl;
}

const libsql = createClient({ url: libsqlUrl });

// Create Prisma adapter
const adapter = new PrismaLibSql(libsql);

export const prisma =
	globalForPrisma.prisma ??
	new PrismaClient({
		log: ['error'],
		adapter
	});

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

export default prisma;
