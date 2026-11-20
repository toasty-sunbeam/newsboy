# CLAUDE.md

This is **Newsboy**, a personalized news reader with a Victorian street urchin named Pip who fetches your news.

## Project Philosophy

- Anti-doomscroll: finite daily content, not infinite feed
- Image-heavy, visually rich
- Conversational tuning (talk to Pip to adjust preferences)
- Single user, self-hosted on James's Synology NAS (Urithiru)

## Tech Stack

- **Runtime**: Bun
- **Framework**: SvelteKit (full-stack: API routes + frontend)
- **Database**: SQLite via Prisma
- **Styling**: Tailwind CSS
- **External APIs**: Claude (Haiku), Replicate (SD 1.5), Unsplash

## Key Files

```
docs/DESIGN.md           — Full product spec (read this first!)
prisma/schema.prisma     — Database schema
src/lib/server/
  batch.ts               — Nightly job (RSS fetch, scoring, crayon gen, briefing)
  rss.ts                 — RSS parsing utilities
  replicate.ts           — Crayon drawing generation
  claude.ts              — Pip's voice (briefings, tuning responses)
  db.ts                  — Prisma client with libsql adapter
src/routes/
  +page.svelte           — Main feed UI
  settings/+page.svelte  — Category-based feed management
  api/feed/+server.ts    — Feed endpoints
  api/briefing/+server.ts — Briefing endpoints
  api/tune/+server.ts    — Conversational tuning
  api/sources/+server.ts — Source management (list, add, delete, toggle)
  api/sources/bulk/+server.ts — Bulk feed addition
```

## Feed Management

Instead of OPML import, Newsboy uses **category-based feed management**:

1. Create categories (e.g., "News", "Webcomics", "Tech Blogs")
2. For each category, paste RSS feed URLs (one per line) into a text box
3. Click "Add Feeds" to bulk-import them into the database
4. Each feed is stored with its category for organization

This approach is simpler and more flexible than OPML import, allowing you to organize feeds as you add them rather than managing an external OPML file.

**UI Location**: `/settings`

## Commands

```bash
bun install              # Install dependencies
bun dev                  # Run dev server
bun prisma studio        # View/edit database
bun prisma db push       # Apply schema changes
bun run batch            # Manually trigger nightly job (for testing)
```

## Environment Variables

```
DATABASE_URL="file:/data/newsboy.db"   # set by docker-compose.yml
ANTHROPIC_API_KEY="sk-ant-..."
UNSPLASH_ACCESS_KEY="..."
REPLICATE_API_TOKEN="r8_..."           # optional; crayon generation is off by default
CRAYON_GENERATION_ENABLED="false"
```

Secrets live in the Portainer stack's environment variables on the NAS, never in the repo.

## Deployment (how Claude ships changes)

- Netlify is gone; the SvelteKit adapter is `adapter-node`. Don't switch it back.
- Push to `main` → `.github/workflows/docker.yml` builds an amd64 image and pushes
  `ghcr.io/toasty-sunbeam/newsboy:latest` (plus a `sha-<commit>` tag).
- Watchtower on the NAS polls every 5 minutes and recreates the `newsboy` container.
- Pull requests build the image without pushing; a green PR check means the image builds.
- Check CI from a sandbox without auth (public repo):
  `curl -s https://api.github.com/repos/toasty-sunbeam/newsboy/actions/runs?per_page=3`
- The SQLite DB is bind-mounted at `/volume1/docker/newsboy/data` on the NAS; the entrypoint runs
  `prisma db push` on start, so schema changes apply automatically. Avoid destructive schema changes.
- Rollback: set the stack's image to a previous `sha-<commit>` tag in Portainer.
- Cloud sandboxes can't download Prisma engines (binaries.prisma.sh is blocked), so a local
  `vite build` fails there. Use the PR build as the real check.

## Implementation Status

**→ See `docs/DESIGN.md` for the complete implementation status and progress tracking.**

## Pip's Voice

Pip is a cockney Victorian newsboy. Examples:

- "Mornin' gov'nor! Got 10 proper good stories for ya today!"
- "Less gloomy stuff, more joy? Right you are!"
- "That's the lot of it, gov'nor! Have yourself a rest."

All system messages should use this voice. See DESIGN.md for more examples.

## Notes for Claude Code

- This is single-user, no auth needed
- Click on any article opens original in new tab (no in-app reader)
- No read/unread state tracking needed for MVP
- Crayon drawings use SD 1.5 on Replicate (~$0.004/image)
- Keep it simple—we can add complexity later
