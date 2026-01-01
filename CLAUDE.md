# CLAUDE.md

This is **Newsboy**, a personalized news reader with a Victorian street urchin named Pip who fetches your news.

## Project Philosophy

- Anti-doomscroll: finite daily content, not infinite feed
- Image-heavy, visually rich
- Conversational tuning (talk to Pip to adjust preferences)
- Single user, self-hosted on Synology NAS

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
DATABASE_URL="file:./newsboy.db"
ANTHROPIC_API_KEY="sk-ant-..."
REPLICATE_API_TOKEN="r8_..."
UNSPLASH_ACCESS_KEY="..."
```

## Current Status

**Phase 1: In Progress**

✅ Completed:
- SvelteKit + Bun + Prisma 7 initialized
- Database schema created with driverAdapters support
- Tailwind CSS configured
- Category-based feed management UI at `/settings`
- SQLite database connected via libsql adapter
- RSS/Atom feed parsing (custom implementation)
- Batch job for fetching and storing articles

🚧 Next:
- Basic two-column feed UI (all articles, no drip)
- Nightly batch cron

## Implementation Order

### Phase 1: Foundation
1. [x] Initialize SvelteKit + Prisma + Tailwind
2. [x] Create database schema from DESIGN.md
3. [x] Category-based feed management (create categories, paste RSS URLs)
4. [x] RSS fetching and article storage
5. [ ] Basic two-column feed UI (all articles, no drip)
6. [ ] Nightly batch cron (just RSS fetch, no AI yet)

### Phase 2: Core Features  
7. [ ] Drip logic (10 initial + 2/hour reveal)
8. [ ] "Caught up" state with Unsplash
9. [ ] Crayon drawing generation for image-less articles
10. [ ] Daily briefing generation (Claude Haiku + Pip voice)
11. [ ] Briefing history browsing

### Phase 3: Conversational Tuning
12. [ ] Preference profile storage
13. [ ] Tuning endpoint (parse intent, update prefs)
14. [ ] Pip-voiced responses
15. [ ] Apply preferences to article scoring

### Phase 4: Polish
16. [ ] Settings UI (manage sources, drip rate)
17. [ ] Error handling and edge cases
18. [ ] Docker container for NAS deployment

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
