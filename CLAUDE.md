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
src/routes/
  +page.svelte           — Main feed UI
  api/feed/+server.ts    — Feed endpoints
  api/briefing/+server.ts — Briefing endpoints
  api/tune/+server.ts    — Conversational tuning
```

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

**Not started.** Ready for Phase 1 implementation.

## Implementation Order

### Phase 1: Foundation
1. [ ] Initialize SvelteKit + Prisma + Tailwind
2. [ ] Create database schema from DESIGN.md
3. [ ] OPML import function
4. [ ] RSS fetching and article storage
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
