# ---- Stage 1: Install dependencies ----
FROM oven/bun:1 AS deps

WORKDIR /app

COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

# ---- Stage 2: Generate Prisma client + build app ----
FROM oven/bun:1 AS build

WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Generate Prisma client
RUN bunx prisma generate

# Build SvelteKit (adapter-node outputs to /app/build)
RUN bun run build

# ---- Stage 3: Production runtime ----
FROM oven/bun:1-slim AS runtime

WORKDIR /app

# Create data directory for SQLite
RUN mkdir -p /data

# Copy built app and production dependencies
COPY --from=build /app/build ./build
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/package.json ./

# Copy Prisma files (needed for db push at startup)
COPY --from=build /app/prisma ./prisma
COPY --from=build /app/prisma.config.ts ./

# Copy entrypoint script
COPY docker-entrypoint.sh ./
RUN chmod +x docker-entrypoint.sh

# SvelteKit adapter-node defaults
ENV HOST=0.0.0.0
ENV PORT=3000
ENV DATABASE_URL=file:/data/newsboy.db

EXPOSE 3000

# Volume for persistent SQLite database
VOLUME /data

ENTRYPOINT ["./docker-entrypoint.sh"]
