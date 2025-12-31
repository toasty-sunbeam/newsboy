// Prisma 7 configuration for migrations
import type { Config } from '@prisma/client';

const config: Config = {
	datasources: {
		db: {
			url: process.env.DATABASE_URL || 'file:./newsboy.db'
		}
	}
};

export default config;
