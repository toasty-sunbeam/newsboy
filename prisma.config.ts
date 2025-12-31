// Prisma 7 configuration for migrations
import { defineConfig } from 'prisma/config';

export default defineConfig({
	datasource: {
		url: process.env.DATABASE_URL || 'file:./newsboy.db'
	}
});
