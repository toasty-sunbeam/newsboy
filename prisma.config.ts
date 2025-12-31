// Prisma 7 configuration for migrations
// This file provides database URL for Prisma CLI commands (migrate, db push, etc.)

export default {
	datasources: {
		db: {
			url: process.env.DATABASE_URL || 'file:./newsboy.db'
		}
	}
};
