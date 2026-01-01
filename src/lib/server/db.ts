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

// For local SQLite files with libsql, use relative path with file: prefix
// libsql expects: file:path.db for local files (relative to CWD)
let libsqlUrl: string;
if (databaseUrl.startsWith('file:')) {
	// Keep the file: URL as-is for local files
	// libsql will resolve relative paths from the current working directory
	libsqlUrl = databaseUrl;
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
