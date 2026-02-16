# Docker Deployment on Synology NAS

## Quick Start

1. **Copy the repo** to your NAS (e.g., `/volume1/docker/newsboy/`)

2. **Create your `.env` file** from the template:
   ```bash
   cp .env.example .env
   # Edit .env with your actual API keys
   ```

3. **Set your NAS IP** in `docker-compose.yml` — update the `ORIGIN` line:
   ```yaml
   - ORIGIN=http://192.168.x.x:3000
   ```

4. **Start it**:
   ```bash
   docker compose up -d
   ```

5. **Open** `http://your-nas-ip:3000`

## How It Works

| File | Purpose |
|---|---|
| `Dockerfile` | Multi-stage build using `oven/bun` — installs deps, generates Prisma client, builds SvelteKit, produces a slim runtime image |
| `docker-compose.yml` | One-command deployment with persistent volume for the SQLite database |
| `docker-entrypoint.sh` | Runs `prisma db push` on startup (creates/migrates the DB automatically), then starts the app |
| `.dockerignore` | Keeps the build context small (excludes node_modules, .git, db files, etc.) |

The SQLite database persists in a Docker volume (`newsboy-data`), so it survives container rebuilds. The built-in cron scheduler handles the nightly batch job automatically — no external cron configuration needed.

## Updating

```bash
git pull
docker compose up -d --build
```

## Logs

```bash
docker compose logs -f newsboy
```

## Manual Batch Run

If you want to trigger the nightly feed fetch manually (e.g., right after first setup):

```bash
docker compose exec newsboy bun run batch
```

## Stopping

```bash
docker compose down
```

Data is preserved in the `newsboy-data` volume. To remove everything including the database:

```bash
docker compose down -v
```
