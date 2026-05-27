// Prisma 7 configuration for migrations
import { defineConfig } from 'prisma/config';
import { PrismaLibSql } from '@prisma/adapter-libsql';

const url = process.env.DATABASE_URL ?? 'file:./newsboy.db';
const authToken = process.env.DATABASE_AUTH_TOKEN;

export default defineConfig({
	datasource: {
		url
	},
	migrate: {
		adapter: () =>
			new PrismaLibSql({
				url,
				...(authToken ? { authToken } : {})
			})
	}
});
