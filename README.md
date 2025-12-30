# Newsboy

A personalized news reader with a Victorian street urchin named Pip who fetches your news.

## What's Been Set Up

- ✅ SvelteKit with Bun runtime
- ✅ Prisma ORM with SQLite database
- ✅ Tailwind CSS for styling
- ✅ Database schema (6 models: Source, Article, DailyBriefing, DailySlot, UserPreferences, TuningLog)
- ✅ Basic welcome page

## Getting Started

### 1. Install Dependencies

```bash
npm install  # or bun install if npm registry is accessible
```

### 2. Initialize Database

```bash
bun prisma generate
bun prisma db push
```

This creates the SQLite database at `./prisma/newsboy.db` with all tables from the schema.

### 3. Set Up Environment Variables

Copy `.env.example` to `.env` and add your API keys:

```bash
DATABASE_URL="file:./newsboy.db"
ANTHROPIC_API_KEY="sk-ant-..."      # For Pip's voice (Claude Haiku)
REPLICATE_API_TOKEN="r8_..."        # For crayon drawings (SD 1.5)
UNSPLASH_ACCESS_KEY="..."           # For "caught up" state images
```

### 4. Run Development Server

```bash
bun dev
```

Visit http://localhost:5173 to see Pip's welcome message!

## Project Structure

```
newsboy/
├── prisma/
│   └── schema.prisma          # Database schema (6 models)
├── src/
│   ├── lib/
│   │   └── server/
│   │       └── db.ts          # Prisma client wrapper
│   ├── routes/
│   │   ├── +layout.svelte     # Root layout (imports Tailwind)
│   │   └── +page.svelte       # Welcome page
│   ├── app.html               # HTML template
│   └── app.css                # Tailwind imports
├── static/                    # Static assets
├── CLAUDE.md                  # Quick reference for Claude Code
└── docs/
    └── DESIGN.md              # Full product specification
```

## Next Steps (Phase 1)

See `CLAUDE.md` for the full implementation order. Next up:

1. [ ] OPML import function
2. [ ] RSS fetching and article storage
3. [ ] Basic two-column feed UI (all articles, no drip)
4. [ ] Nightly batch cron (just RSS fetch, no AI yet)

## Useful Commands

```bash
bun dev                  # Start dev server
bun build               # Build for production
bun preview             # Preview production build

bun prisma studio       # Visual database browser
bun prisma db push      # Apply schema changes
bun run batch           # Manually run nightly job (when implemented)
```

## Tech Stack

- **Runtime**: Bun
- **Framework**: SvelteKit (full-stack)
- **Database**: SQLite via Prisma
- **Styling**: Tailwind CSS
- **APIs**: Claude (Haiku), Replicate (SD 1.5), Unsplash

## Database Schema

### Models

1. **Source** - RSS feed sources (name, URL, type)
2. **Article** - Fetched articles with images, metadata
3. **DailyBriefing** - Pip's daily top 3 picks with cockney summaries
4. **DailySlot** - Drip-feed scheduling (when articles are revealed)
5. **UserPreferences** - Interest weights, mood balance, format preferences
6. **TuningLog** - Conversation history for algorithm tuning

See `prisma/schema.prisma` for the full schema.

## Philosophy

- **Anti-doomscroll**: Finite daily content, not infinite feed
- **Image-heavy**: Visually rich cards with hero images or Pip's crayon drawings
- **Conversational tuning**: Talk to Pip to adjust preferences
- **Single user**: Self-hosted on Synology NAS, no auth needed

---

Ready to let Pip fetch your news! 🗞️
