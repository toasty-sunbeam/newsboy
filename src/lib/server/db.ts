// Database client - Prisma wrapper
// Prisma 7: Use libsql adapter for Bun compatibility

import { PrismaClient } from '@prisma/client';
import { PrismaLibSql } from '@prisma/adapter-libsql';

const globalForPrisma = globalThis as unknown as {
	prisma: PrismaClient | undefined;
};

// Create libSQL adapter for local SQLite file
const databaseUrl = process.env.DATABASE_URL || 'file:newsboy.db';

console.log('[Prisma] Database URL:', databaseUrl);

// Create Prisma adapter (it handles the libsql client internally)
const adapter = new PrismaLibSql({
	url: databaseUrl
});

export const prisma =
	globalForPrisma.prisma ??
	new PrismaClient({
		log: ['error'],
		adapter: adapter as any
	});

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

export default prisma;
