// Prisma 7 configuration for migrations
// This file is used by Prisma CLI for migrations

export default {
	datasources: {
		db: {
			url: process.env.DATABASE_URL || 'file:./newsboy.db'
		}
	}
};
