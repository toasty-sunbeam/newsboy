// Database client - Prisma wrapper
// Prisma 7: Use libsql adapter for Turso (or local SQLite fallback)

import { PrismaClient } from '@prisma/client';
import { PrismaLibSql } from '@prisma/adapter-libsql';

const globalForPrisma = globalThis as unknown as {
	prisma: PrismaClient | undefined;
};

const databaseUrl = process.env.DATABASE_URL || 'file:newsboy.db';
const authToken = process.env.DATABASE_AUTH_TOKEN;

console.log('[Prisma] Database URL:', databaseUrl);

// authToken required for Turso remote DBs; omit for local file URLs
const adapter = new PrismaLibSql({
	url: databaseUrl,
	...(authToken ? { authToken } : {})
});

export const prisma =
	globalForPrisma.prisma ??
	new PrismaClient({
		log: ['error'],
		adapter
	});

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

export default prisma;
