// Database client - Prisma wrapper
// Prisma 7: Use libsql adapter for Bun compatibility

import { PrismaClient } from '@prisma/client';
import { PrismaLibSql } from '@prisma/adapter-libsql';
import { createClient } from '@libsql/client';
import path from 'path';

const globalForPrisma = globalThis as unknown as {
	prisma: PrismaClient | undefined;
};

// Create libSQL client for local SQLite file
const databaseUrl = process.env.DATABASE_URL || 'file:newsboy.db';

// Convert file: URLs to proper format for libsql
let libsqlUrl: string;
if (databaseUrl.startsWith('file:')) {
	// Extract the path after 'file:'
	const filePath = databaseUrl.replace(/^file:/, '');

	// If it's a relative path, convert to absolute
	const absolutePath = path.isAbsolute(filePath) ? filePath : path.resolve(filePath);

	// libsql needs file:/// (three slashes) for absolute paths
	libsqlUrl = `file:///${absolutePath.replace(/^\//, '')}`;
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
