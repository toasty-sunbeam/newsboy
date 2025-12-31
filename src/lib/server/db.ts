// Database client - Prisma wrapper
// Prisma 7: Use libsql adapter for Bun compatibility

import { PrismaClient } from '@prisma/client';
import { PrismaLibSql } from '@prisma/adapter-libsql';
import { createClient } from '@libsql/client';

const globalForPrisma = globalThis as unknown as {
	prisma: PrismaClient | undefined;
};

// Create libSQL client for local SQLite file
const databaseUrl = process.env.DATABASE_URL || 'file:newsboy.db';

// For local files, libsql needs the path without 'file:' prefix
const isLocalFile = databaseUrl.startsWith('file:');
const libsql = createClient({
	url: isLocalFile ? databaseUrl.replace('file:', 'file://') : databaseUrl
});

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
