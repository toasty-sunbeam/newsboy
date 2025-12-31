// Database client - Prisma wrapper
// Prisma 7: Database URL passed to PrismaClient constructor

import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
	prisma: PrismaClient | undefined;
};

const databaseUrl = process.env.DATABASE_URL || 'file:./newsboy.db';

export const prisma =
	globalForPrisma.prisma ??
	new PrismaClient({
		log: ['error'],
		datasourceUrl: databaseUrl
	});

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

export default prisma;
