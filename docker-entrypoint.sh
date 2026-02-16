#!/bin/sh
set -e

echo "🗞️  Newsboy starting up..."

# Apply database schema (creates DB if it doesn't exist, applies migrations)
echo "📦 Ensuring database schema is up to date..."
bunx prisma db push --skip-generate 2>&1

echo "✅ Database ready at $DATABASE_URL"
echo "🗞️  Starting Newsboy on port ${PORT:-3000}..."

# Start the SvelteKit server
exec bun build/index.js
