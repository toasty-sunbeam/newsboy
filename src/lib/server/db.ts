// Database client - Prisma wrapper
// Prisma 7: Use libsql adapter for Bun compatibility

import { PrismaClient } from '@prisma/client';
import { PrismaLibSQL } from '@prisma/adapter-libsql';
import { createClient } from '@libsql/client';

const globalForPrisma = globalThis as unknown as {
	prisma: PrismaClient | undefined;
};

// Create libSQL client for local SQLite file
const databaseUrl = process.env.DATABASE_URL || 'file:newsboy.db';

console.log('[Prisma] Database URL:', databaseUrl);

const libsql = createClient({ url: databaseUrl });

// Create Prisma adapter
const adapter = new PrismaLibSQL(libsql);

export const prisma =
	globalForPrisma.prisma ??
	new PrismaClient({
		log: ['error'],
		adapter
	});

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

export default prisma;
