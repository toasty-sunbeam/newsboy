# Newsboy — Design Document

## Overview

A visually rich, image-heavy news reader that curates personalized articles in the background and delivers them in controlled doses rather than enabling infinite scrolling. The app respects your attention by providing a finite, beautiful reading experience.

**Pip** is your scrappy Victorian street urchin who runs out into the chaos of the internet, fetches the news you care about, and brings it back to you with enthusiasm. He's got a cockney accent, a bedraggled newsboy cap, and genuine delight when you appreciate his work.

## Core Philosophy

**Anti-doomscroll by design.** Most news apps optimize for engagement through endless content. This app optimizes for *informed satisfaction*—giving you what matters without the compulsion loop.

## The Pip Character

Pip is the personality layer for all system interactions. He's:
- Eager and hardworking ("Right then, I've got 10 fresh stories for ya, gov'nor!")
- Pleased by appreciation ("Aw, that's awfully kind of ya!")
- Helpful when you give him direction ("Less doom, more cheer? I'll see what I can scrounge up!")
- Honest about limitations ("Sorry gov, I couldn't find much on that topic today")

### Voice Examples

**Morning greeting:**
> "Mornin' gov'nor! I've been up since dawn collectin' the news. Got 10 proper good stories for ya today!"

**When you tune the algorithm:**
> "Less gloomy stuff, more joy? Right you are! I'll keep me eyes peeled for the brighter bits."

**Caught up state:**
> "That's the lot of it, gov'nor! Have yourself a rest. I'll be back with more in about an hour."

**When you add a new interest:**
> "Robotics, eh? Fancy stuff! I'll start askin' around about that straightaway."

**When thanked or given a "coin":**
> "Aw, that's awfully generous of ya, gov'nor! Makes all the runnin' about worth it, it does!"

### Pip's Daily Briefing

Each day starts with Pip presenting his top 3 picks in his own words. This appears as a special card at the top of the feed:

> "Mornin' gov'nor! Got some crackin' stories today, I have!
> 
> First off, them scientists over in Switzerland made a robot what can fold itself up like origami—proper clever stuff, that is!
> 
> Then there's this bloke in Japan who's gone and 3D printed an entire little house. Took 'im just 24 hours!
> 
> And you'll like this one—a whole pod of dolphins helped some fishermen rescue a swimmer off the coast of New Zealand. Good news, that!"

**Implementation:**
- Generated once daily via Claude API (during midnight batch)
- Pip selects 3 stories he thinks you'll like most
- Summaries are brief, enthusiastic, in-character
- Links to the full articles below the briefing
- Regular article cards use original text/excerpts (no Pip voice)
- **All briefings stored in database** — can browse previous days to look something up

### Visual Design
- Pixel art style illustrations of Pip
- Various poses/expressions for different states (delivering news, waiting, pleased, searching)
- Small avatar in UI corner or integrated into system messages
- Art to be created separately

### Implementation Notes
- All system messages are written in Pip's voice
- The LLM generates responses in-character when doing conversational tuning
- The persona should be charming, never annoying—use sparingly in routine interactions

## User Experience

### Daily Rhythm

1. **Midnight batch**: Fetch and process all RSS feeds, score and queue the next day's articles
2. **First load of the day**: Display 10 curated stories
3. **Hourly reveal**: 2 more stories become available each hour (already fetched, just revealed)
4. **Daily cap**: Maximum of ~20-24 stories per day (configurable)
5. **Visual feedback**: Clear indication of "you're caught up" state

No pull-to-refresh needed—everything is pre-fetched and revealed on a schedule.

### Reading Interface

- **Two-column masonry layout**: Imgur-style visual grid, but slightly more relaxed with two columns instead of three
- **Card-based design**: Each story is a visual card with:
  - Featured image (from article, or Pip's crayon drawing if none available)
  - Headline
  - Source attribution
  - Brief excerpt
  - Estimated read time
  - Topic/category tag
- **No infinite scroll**: All daily articles loaded at once, no pagination
- **No state indicators**: No new/available/read distinctions—just content
- **Click behavior**: Opens original article in new tab (no in-app reader for MVP)
### Visual Imagery Throughout

Beautiful, calming images frame the reading experience:
- **Header image**: Full-width Unsplash photo at top of every page (200px mobile, 300px desktop)
- **Footer image**: Full-width Unsplash photo at bottom after articles (60vh height)
- **Always present**: Images displayed whenever articles exist, not just when caught up
- **Image sources**: Unsplash API pulls from nature, landscapes, architecture, minimal, and space categories
- **Pip's message**: "That's all for now, gov'nor! Have yourself a rest."
  - Timing adapts: "I'll be back with fresh news in X hours" (tomorrow) or "I'll be back with more stories in X minutes" (later today)
- **Photo credits**: Attribution links for Unsplash photographers
- **No anxiety, no FOMO**: Visual richness and calming imagery create a satisfying endpoint

### Visual Design Principles

- Image-forward: Images should occupy 60%+ of visual space
- High contrast, readable typography
- Light mode only (dark mode deferred to Phase 3)
- Subtle animations for state transitions
- No visual clutter—no share counts, no comment counts, no engagement metrics

## Conversational Algorithm Tuning

### Core Concept

Instead of traditional preference controls (sliders, upvote/downvote, topic checkboxes), the primary way to adjust the feed is through natural language conversation. A text input where you can say things like:

- "Too many gloomy stories today, add more joy"
- "I'm interested in robotics and 3D printing"
- "Less politics for a while"
- "More long-form pieces, fewer quick hits"
- "I've been seeing too much from TechCrunch lately"
- "Show me more webcomics in the morning"

### How It Works

1. **Input**: User types a natural language instruction
2. **Interpretation**: LLM (Claude) parses the intent and extracts:
   - Topic adjustments (add/remove/weight interests)
   - Source adjustments (boost/suppress specific feeds)
   - Mood/tone preferences (uplifting vs. serious)
   - Timing preferences (when certain content appears)
   - Format preferences (long vs. short, visual vs. text-heavy)
3. **Profile Update**: System updates the user's preference profile
4. **Confirmation**: Brief response confirming the change in plain language
5. **Immediate Effect**: Next feed refresh reflects the adjustment

### Preference Profile Structure

```
UserPreferences
  - interests: WeightedTopic[]        # "robotics": 0.8, "politics": 0.2
  - sourceWeights: SourceWeight[]     # per-feed boost/suppress
  - moodBalance: number               # -1 (serious) to +1 (uplifting)
  - formatPreferences: {
      preferLongForm: boolean
      preferVisual: boolean
    }
  - temporalRules: TemporalRule[]     # "webcomics in morning"
  - recentAdjustments: Adjustment[]   # history for context
```

### Example Interaction Flow

```
User: "I'm tired of AI doomer articles. More hopeful tech stuff."

System parses:
  - Suppress: articles with negative AI sentiment
  - Boost: articles tagged "technology" + positive sentiment
  - Add interest weight: "optimistic tech", "innovation"

Response: "Got it—I'll dial back the AI doom and look for more 
hopeful tech stories. You should see the shift in your next batch."
```

### Conversation Context

The tuning interface should remember recent adjustments so you can have exchanges like:

```
User: "Actually, that was too aggressive. Some serious AI news is fine."

System: Partially reverts previous adjustment, finds middle ground.

Response: "Understood—I'll keep some substantive AI coverage, 
just skip the pure doom pieces."
```

### Implementation Notes

- Store last N adjustments for conversation context
- LLM call interprets intent → structured profile changes
- Changes are additive/incremental, not full replacements
- Include "reset to defaults" escape hatch
- Log adjustments so user can review what they've asked for

## Technical Architecture

### Backend Components

#### 1. Article Discovery Service
- Runs on a schedule (every 15-30 minutes)
- Sources (MVP):
  - RSS feeds (user's existing collection)
  - Webcomic RSS feeds (mixed into main feed)
- Future sources:
  - News APIs (NewsAPI, Google News, etc.)
  - Direct site scraping where permitted
- Extracts:
  - Title, URL, source
  - Publication date
  - Full article text (for summarization) OR comic image
  - Images (hero image required for articles)
  - Content type flag: article vs. webcomic

#### 2. Personalization Engine
- User interest profile (explicit topics + learned preferences)
- Scoring algorithm considers:
  - Topic relevance to user interests
  - Source quality/trustworthiness
  - Recency
  - Image quality score
  - Diversity (avoid topic clustering)
- Deduplication (same story from multiple sources)

#### 3. Content Processing Pipeline
- Image extraction and dimension analysis
- If no usable image → generate Pip's crayon drawing via Replicate SD 1.5
- Reading time estimation
- Category/topic classification
- Cache generated crayon images for reuse

#### 4. Nightly Batch Process (Bun.cron @ midnight)

Single process handles everything:
1. Fetch all RSS feeds
2. Parse and dedupe articles
3. Score and rank by user preferences
4. Select top ~24 articles for tomorrow
5. For each article without an image → call Replicate SD 1.5, save crayon URL
6. Generate daily briefing via Claude Haiku
7. Save everything to SQLite

Runs ~5-15 minutes depending on feed count and images needed. All done while you sleep—everything ready when you wake up.

### Frontend Components

#### 1. Main Feed View
- Two-column masonry grid of article cards
- All revealed articles shown (no state indicators)
- Click any card → opens original article in new tab
- Pip's daily briefing card at the top
- Date picker or "previous day" nav to browse past briefings

#### 2. Settings (`/settings`)
- **Category-based feed management**:
  - Create custom categories (News, Webcomics, Tech Blogs, etc.)
  - For each category, paste RSS feed URLs (one per line) into a text box
  - Bulk import all URLs with a single "Add Feeds" button
  - View all feeds grouped by category
  - Toggle feeds on/off or delete them
- Interest configuration
- Drip rate adjustment

**Why category-based instead of OPML?**
- Simpler: No need to export from another app or manage XML files
- More flexible: Organize feeds as you add them, not as an afterthought
- Single-user friendly: Just paste URLs and go
- Better UX: Visual organization by category makes it easy to see what you're subscribed to

#### 3. Conversational Tuning
- Text input to talk to Pip
- Adjustment history

### Data Models

```
User
  - id
  - preferences: UserPreferences
  - sources: Source[]
  - settings: UserSettings

Article
  - id
  - url
  - title
  - source: Source
  - publishedAt: datetime
  - fetchedAt: datetime
  - contentType: 'article' | 'webcomic'
  - heroImageUrl: string | null
  - crayonImageUrl: string | null          # Pip's drawing if no hero image
  - imageWidth: number | null
  - imageHeight: number | null
  - displayMode: 'standard' | 'wide' | 'tall' | 'preview' | 'square' | 'crayon'
  - summary: string | null
  - fullText: string | null
  - readingTimeMinutes: number | null
  - topics: string[]
  - relevanceScore: number

DailyBriefing
  - id
  - date: date                             # Unique per day, used for history browsing
  - pipSummary: string                     # Pip's cockney briefing text
  - featuredArticleIds: string[]           # The 3 articles Pip picked
  - generatedAt: datetime

UserArticle
  - userId
  - articleId
  - availableAt: datetime
  - seenAt: datetime | null
  - readAt: datetime | null
  - saved: boolean

Source
  - id
  - name
  - feedUrl: string
  - siteUrl: string
  - category: string              // User-defined category (News, Webcomics, etc.)
  - contentType: 'article' | 'webcomic' | 'mixed'
  - enabled: boolean
```

### API Endpoints

```
GET  /api/feed              # Get today's available articles
GET  /api/feed/:date        # Get articles from a specific date

GET  /api/briefing          # Get today's Pip briefing
GET  /api/briefing/:date    # Get briefing from a specific date (for history)
GET  /api/briefings         # List all past briefings (for browsing)

POST /api/tune              # Conversational preference adjustment
GET  /api/tune/history      # Recent tuning adjustments

GET    /api/sources           # Get configured sources (RSS feeds), grouped by category
POST   /api/sources/bulk     # Bulk add feeds from pasted URLs (with category)
DELETE /api/sources/:id      # Remove source
PUT    /api/sources/:id      # Update source (toggle enabled state)

GET  /api/settings          # Get user settings
PUT  /api/settings          # Update settings
```

## Implementation Status

**See this section for current progress. This is the single source of truth for implementation status.**

### Phase 1: Foundation (In Progress)

1. ✅ **Initialize SvelteKit + Prisma + Tailwind**
   - SvelteKit with Bun runtime configured
   - Prisma 7 with libsql adapter for SQLite
   - Tailwind CSS integrated

2. ✅ **Create database schema from DESIGN.md**
   - 6 models: Source, Article, DailyBriefing, DailySlot, UserPreferences, TuningLog
   - Full schema with driverAdapters support

3. ✅ **Category-based feed management**
   - Settings UI at `/settings`
   - Create categories, paste RSS URLs (bulk import)
   - List, toggle, delete feeds
   - API endpoints: `/api/sources`, `/api/sources/bulk`, `/api/sources/[id]`

4. ✅ **RSS fetching and article storage**
   - Custom RSS/Atom parser implementation
   - Fetch and store articles with metadata
   - Batch processing utilities in `src/lib/server/rss.ts` and `src/lib/server/batch.ts`

5. ✅ **Basic two-column feed UI (all articles, no drip)**
   - Feed API endpoint at `/api/feed`
   - ArticleCard component with image support
   - Two-column masonry grid layout (responsive)
   - Loading, empty, and error states
   - Pip's voice throughout UI
   - Click opens original article in new tab

6. ✅ **Nightly batch cron (just RSS fetch, no AI yet)**
   - Lightweight cron scheduler in `src/lib/server/cron.ts`
   - Starts automatically via `src/hooks.server.ts` on server startup
   - Runs at midnight daily
   - API endpoint at `/api/batch` for status and manual trigger

### Phase 2: Core Features
7. ✅ **Drip logic**
   - DailySlot creation in batch process (`src/lib/server/batch.ts`)
   - revealHour filtering in feed API (`src/routes/api/feed/+server.ts`)
   - Drip status display in frontend with next reveal time
   - 0 articles at midnight, 2 each hour until 48 total
8. ✅ **Unsplash imagery throughout the reading experience**
   - Unsplash API endpoint (`src/routes/api/unsplash/+server.ts`) fetches random calming images
   - Header image: Full-width Unsplash photo at top of page (200px mobile, 300px desktop)
   - Footer image: Full-width Unsplash photo at bottom, after all articles (60vh height)
   - Images displayed ALL THE TIME when articles are present, not just when caught up
   - CaughtUp component (`src/lib/components/CaughtUp.svelte`) displays footer image
   - Pip's message: "That's all for now, gov'nor! Have yourself a rest."
   - Timing adapts: "I'll be back with fresh news in X hours" (tomorrow) or "I'll be back with more stories in X minutes" (later today)
   - Photo credits with Unsplash attribution links
   - Edge-to-edge full-width design for maximum visual impact
   - Test mode: Add `?test=caughtup` to URL to simulate caught-up state
9. ✅ **Crayon drawing generation for image-less articles (Replicate SD 1.5)**
   - Complete replicate.ts integration with SD 1.5
   - Rate limiting protection (2s delays + exponential backoff retry)
   - Feature flag: CRAYON_GENERATION_ENABLED (defaults to false)
   - Integrated into nightly batch process
   - Manual trigger via POST /api/batch?crayons=true
   - Crayon playground at /crayon-playground for prompt experimentation
   - ArticleCard displays crayon images with "Drawn by Pip" badge
   - Placeholder shown for articles without images when feature disabled
10. ✅ **Daily briefing generation (Claude Haiku + Pip voice)**
   - claude.ts implementation with generateDailyBriefing function
   - Uses Claude Haiku for cost efficiency (~$0.50/month)
   - Generates Pip's cockney briefing for top 3 articles
   - Integrated into nightly batch process (generateBriefingForTomorrow)
   - Manual trigger via POST /api/batch?briefing=true
   - API endpoints: GET /api/briefing, GET /api/briefing/:date, GET /api/briefing?all=true
   - BriefingCard component with Victorian newspaper styling
   - Displayed at top of feed with featured articles links
   - Fallback briefing if API fails
   - Briefings stored in database for history browsing
11. [ ] Briefing history browsing

### Phase 3: Conversational Tuning
12. [ ] Preference profile storage
13. [ ] Tuning endpoint (parse intent, update prefs)
14. [ ] Pip-voiced responses
15. [ ] Apply preferences to article scoring

### Phase 4: Polish
16. [ ] Settings UI (manage sources, drip rate)
17. [ ] Error handling and edge cases
18. ✅ **Docker container for NAS deployment**
   - Multi-stage Dockerfile using `oven/bun` (deps → build → slim runtime)
   - docker-compose.yml for one-command Synology deployment
   - Entrypoint script auto-applies DB schema on first start
   - SQLite persisted via Docker volume (`newsboy-data`)
   - SvelteKit switched from adapter-auto to adapter-node
   - See `DOCKER.md` for deployment instructions

## MVP Scope

### Phase 1: Core Reading Experience
- [x] **Category-based feed management** (create categories, paste RSS URLs, bulk import)
- [x] **Database schema** with Source, Article, DailyBriefing, DailySlot, UserPreferences, TuningLog
- [x] **Settings UI** at `/settings` for managing feeds by category
- [x] **RSS fetching and article storage** (custom parser, batch utilities)
- [x] **Two-column masonry UI** with ArticleCard component
- [x] **Pip persona for system messages** (in UI states and greetings)
- [x] **Click → open original article in new tab**
- [x] Midnight batch: RSS feed fetching cron/scheduler
- [ ] Webcomic support (display comic images inline)
- [ ] Image dimension detection + display mode classification
- [x] **10 articles at first load, +2 revealed hourly (drip logic)**
- [x] **Visual imagery throughout** (Unsplash photos at header and footer, always shown)

### Phase 2: Pip's Personality Features
- [x] **Daily briefing: Pip's top 3 picks with cockney summaries** — integrated with Claude Haiku
- [ ] Briefing history: browse past days
- [x] **Crayon drawings for image-less articles (Replicate SD 1.5)** — with feature flag and playground
- [ ] Text input for natural language preference adjustment
- [ ] Claude API (Haiku) for intent parsing
- [ ] Pip-voiced responses for tuning
- [ ] Preference profile storage and application
- [ ] "Tip Pip" interaction (fun feedback mechanism)

### Phase 3: Personalization & Polish
- [ ] Learning from reading behavior (implicit signals)
- [ ] Better deduplication across sources
- [ ] Topic auto-detection and weighting
- [ ] Dark mode
- [ ] Saved articles feature

### Phase 4: Future
- [ ] Pip pixel art avatar integration
- [ ] Additional source types (APIs, scraping)
- [ ] Temporal rules ("webcomics in the morning")
- [ ] Pip remembers past conversations ("You liked them robot stories last week, so I found more!")

## Decisions Made

- **Single-user**: No authentication needed. Simplifies everything.
- **Desktop-first**: No mobile optimization for MVP. Standard responsive web is fine.
- **RSS-first**: Primary source is RSS feeds (news + webcomics). Other sources can come later.
- **Content mix**: News articles AND webcomics in the same feed. Webcomics add visual variety and levity.
- **Feed management**: Category-based system (create categories, paste RSS URLs). No OPML import needed.
- **Character**: Pip (the newsboy) — pixel art illustrations to be created separately.
- **Hosting**: Synology DS220+ (existing NAS). Hetzner VPS as fallback.
- **Runtime**: Bun (fast, modern, good SQLite support).
- **Database**: SQLite (lightweight, no server process, easy backups).
- **ORM**: Prisma (schema-first, type-safe, minimal SQL writing).
- **LLM**: Claude API with Haiku model for cost efficiency.
- **Image generation**: Replicate with Stable Diffusion 1.5 (~$0.004/image).
- **Calming images**: Unsplash API for "caught up" state.
- **Layout**: Two-column masonry grid (Imgur-inspired, but more relaxed).
- **Batch processing**: Single nightly process at midnight (RSS fetch → scoring → crayon generation → briefing → save). No separate workers.
- **No article detail view**: Click opens original in new tab.
- **Dark mode**: Deferred to Phase 3. Light mode only for MVP.
- **No cache layer**: Keep it simple for MVP.

### Initial Topic Interests
- Technology and tech advances
- Science and discoveries
- Maker stuff (3D printing, DIY, hardware)
- Gaming
- Good news / uplifting stories

### Comic Display Behavior
- If comic fits on screen → display inline, click to visit source
- If comic is too tall → show cropped preview (top portion), click to visit source
- Always link to original comic page on click (never try to be a full comic reader)

## Hosting & Cost Strategy

### Primary: Synology DS220+ (Existing Hardware)

The app will run on an existing Synology DS220+ NAS, which already hosts FreshRSS.

**DS220+ Specs:**
- Intel Celeron J4025 dual-core (2.0GHz, bursts to 2.9GHz)
- 2GB DDR4 RAM (upgradeable to 6GB — recommended)
- Docker support via Container Manager
- Always-on, already running 24/7

**Why this works:**
- Heavy compute (LLM, image generation) is offloaded to external APIs
- RSS fetching and serving a single user is lightweight
- Zero additional hosting cost

**Potential concerns:**
- RAM is tight at 2GB if running multiple containers
- CPU may chug during image processing
- Recommendation: Upgrade RAM to 6GB (~$20 one-time)

**Fallback:** If the DS220+ struggles, a Hetzner CX23 VPS costs ~€3.50/month.

### API Services

**Claude API (Haiku) — for Pip's personality:**
- Daily briefing generation: ~1,500 tokens/day
- Conversational tuning: ~2-5 interactions/day × ~500 tokens
- Monthly total: ~120k tokens
- **Cost: ~$0.50/month**

**Replicate (Stable Diffusion 1.5) — for Pip's crayon drawings:**
- ~5-10 image-less articles per day needing drawings
- SD 1.5 on Replicate: ~$0.004/image (~256 images per $1)
- Images are cached (generated once, stored forever)
- **Cost: ~$1-2/month**

### Total Monthly Cost

| Item | Cost |
|------|------|
| Hosting (DS220+) | $0 |
| Claude API (Haiku) | ~$0.50 |
| Replicate SD 1.5 | ~$1-2 |
| **Total** | **~$2-3/month** |

## Image & Content Display

### The Challenge
Webcomics come in wildly different aspect ratios:
- **Landscape** (traditional newspaper strip): ~3:1 or 4:1
- **Portrait** (scrolling webcomics): ~1:3 or taller
- **Square**: ~1:1
- **Variable**: Some comics change format per installment

Articles also vary:
- Some have great hero images
- Some have tiny thumbnails
- Some have no images at all

### Display Strategy

**Card Layout Modes:**

1. **Standard Card** (most articles)
   - Fixed height card with image cropped to fill top portion
   - Title, source, excerpt below
   - Works for most aspect ratios

2. **Wide Card** (landscape comics, ~3:1+)
   - Full-width card spanning grid columns
   - Comic displayed uncropped
   - Minimal text overlay
   - Click → visit source site

3. **Tall Card** (portrait comics that fit reasonably)
   - Taller card that shows full comic if under ~1.5x viewport height
   - Click → visit source site

4. **Preview Card** (very tall scrolling comics)
   - Show cropped top portion of comic (whatever fits nicely)
   - Visual indicator that there's more ("continues...")
   - Click → visit source site to see full comic

5. **Image-Only Card** (square-ish comics)
   - Image fills card
   - Title on hover or below

6. **Crayon Card** (articles without images)
   - AI-generated illustration in a childlike crayon/sketch style
   - As if Pip drew it himself to illustrate the story
   - Charming, rough, endearing—not polished

### Pip's Crayon Drawings

When an article has no usable image, Pip "draws" one for you:
- Generated via Replicate API using Stable Diffusion 1.5 (~$0.004/image)
- Prompt engineered for: childlike crayon drawing, simple shapes, wobbly lines, bright colors, like a Victorian street kid's sketch
- Based on article headline/content
- Cached so we don't regenerate on every view
- Adds warmth and personality to text-heavy feeds
- Small "drawn by Pip" attribution in corner

**Example prompts:**
- "Childlike crayon drawing of a rocket ship going to the moon, wobbly lines, bright colors, simple shapes, on cream paper"
- "Simple crayon sketch of a robot helping a person, drawn by a child, colorful, rough lines"

**Detection Logic:**
- On fetch, analyze image dimensions (if image exists)
- Classify into aspect ratio buckets
- If no image → flag for crayon generation
- Store `displayMode` with article
- Frontend renders appropriate card type

**Comic Click Behavior:**
- All comic clicks open original source in new tab
- Never try to be a full comic reader—just a discovery/preview layer

**Fallbacks:**
- Broken image → attempt crayon generation
- Crayon generation fails → simple colored card with decorative border

## Technology Stack

### Backend
- **Runtime**: Bun (fast, modern, built-in SQLite support)
- **Framework**: SvelteKit (full-stack: API routes + frontend in one codebase)
- **Database**: SQLite (lightweight, file-based, perfect for single-user)
- **ORM**: Prisma (schema-first, type-safe, no raw SQL needed)
- **Scheduled jobs**: Bun.cron for nightly batch (single process handles RSS fetch, image generation, briefing)

### Frontend
- **Framework**: SvelteKit (same as backend—unified codebase)
- **Styling**: Tailwind CSS
- **Layout**: Two-column masonry grid (Imgur-inspired)

### External APIs
- **LLM**: Claude API (Haiku model) via Anthropic SDK
- **Image generation**: Replicate API (Stable Diffusion 1.5)
- **Calming images**: Unsplash API for "caught up" state

### Deployment
- **Platform**: Docker container on Synology DS220+
- **Adapter**: SvelteKit adapter-node (for containerized deployment)
- **Database file**: Stored on NAS volume (`/data/newsboy.db`) for persistence and easy backup
- **Config files**: `Dockerfile`, `docker-compose.yml`, `docker-entrypoint.sh`, `.dockerignore`
- **Instructions**: See `DOCKER.md`

## Open Questions

1. **Pip illustrations**: When to create the pixel art? Block MVP on it or add later?

## Implementation Notes

*For Claude Code and future reference.*

### Getting Started

```bash
# Create project
bun create svelte@latest newsboy
cd newsboy
bun add -d prisma
bun add @prisma/client
bunx prisma init --datasource-provider sqlite

# Add other dependencies
bun add @anthropic-ai/sdk replicate
bun add -d tailwindcss postcss autoprefixer
bunx tailwindcss init -p
```

### Prisma Schema Sketch

```prisma
model Source {
  id          String    @id @default(cuid())
  name        String
  feedUrl     String    @unique
  siteUrl     String?
  category    String    @default("Uncategorized") // User-defined category
  contentType String    @default("article") // article | webcomic | mixed
  enabled     Boolean   @default(true)
  createdAt   DateTime  @default(now())
  articles    Article[]
}

model Article {
  id                String   @id @default(cuid())
  url               String   @unique
  title             String
  sourceId          String
  source            Source   @relation(fields: [sourceId], references: [id])
  publishedAt       DateTime?
  fetchedAt         DateTime @default(now())
  contentType       String   @default("article") // article | webcomic
  heroImageUrl      String?
  crayonImageUrl    String?
  imageWidth        Int?
  imageHeight       Int?
  displayMode       String   @default("standard") // standard | wide | tall | preview | square | crayon
  excerpt           String?
  fullText          String?
  readingTimeMinutes Int?
  topics            String?  // JSON array stored as string
  relevanceScore    Float    @default(0)
  
  dailySlots        DailySlot[]
}

model DailyBriefing {
  id                 String   @id @default(cuid())
  date               DateTime @unique // Just the date, no time
  pipSummary         String   // Pip's cockney briefing text
  featuredArticleIds String   // JSON array of article IDs
  generatedAt        DateTime @default(now())
}

model DailySlot {
  id          String   @id @default(cuid())
  date        DateTime // The day this slot is for
  articleId   String
  article     Article  @relation(fields: [articleId], references: [id])
  revealHour  Int      // 0-23, when this article becomes visible
  position    Int      // Order within the day
  
  @@unique([date, articleId])
}

model UserPreferences {
  id               String   @id @default("default")
  interests        String   @default("{}") // JSON: {"robotics": 0.8, "politics": 0.2}
  sourceWeights    String   @default("{}") // JSON: per-source boost/suppress
  moodBalance      Float    @default(0)    // -1 (serious) to +1 (uplifting)
  preferLongForm   Boolean  @default(false)
  preferVisual     Boolean  @default(true)
  updatedAt        DateTime @updatedAt
}

model TuningLog {
  id          String   @id @default(cuid())
  input       String   // What the user said
  parsed      String   // JSON: what we extracted
  response    String   // What Pip said back
  createdAt   DateTime @default(now())
}
```

### File Structure

```
newsboy/
├── CLAUDE.md
├── DOCKER.md                          # Synology deployment instructions
├── Dockerfile                         # Multi-stage Bun build
├── docker-compose.yml                 # One-command deployment
├── docker-entrypoint.sh               # DB init + app start
├── .dockerignore
├── docs/
│   └── DESIGN.md
├── prisma/
│   ├── schema.prisma           # Database schema with driverAdapters
│   └── prisma.config.ts        # Prisma 7 config
├── src/
│   ├── lib/
│   │   ├── server/
│   │   │   ├── batch.ts        # Nightly job orchestration (TODO)
│   │   │   ├── rss.ts          # RSS fetch and parse (TODO)
│   │   │   ├── scoring.ts      # Article ranking (TODO)
│   │   │   ├── replicate.ts    # Crayon generation (TODO)
│   │   │   ├── claude.ts       # Briefing + tuning (TODO)
│   │   │   └── db.ts           # Prisma client with libsql adapter
│   │   └── components/
│   │       ├── ArticleCard.svelte     (TODO)
│   │       ├── BriefingCard.svelte    (TODO)
│   │       ├── CaughtUp.svelte        (TODO)
│   │       └── TuningInput.svelte     (TODO)
│   └── routes/
│       ├── +page.svelte        # Main feed (welcome page for now)
│       ├── settings/
│       │   └── +page.svelte    # Category-based feed management ✅
│       ├── history/
│       │   └── [date]/
│       │       └── +page.svelte       (TODO)
│       └── api/
│           ├── feed/
│           │   └── +server.ts         (TODO)
│           ├── briefing/
│           │   ├── +server.ts         (TODO)
│           │   └── [date]/
│           │       └── +server.ts     (TODO)
│           ├── tune/
│           │   └── +server.ts         (TODO)
│           └── sources/
│               ├── +server.ts         # List sources ✅
│               ├── [id]/
│               │   └── +server.ts     # Delete/toggle source ✅
│               └── bulk/
│                   └── +server.ts     # Bulk add feeds ✅
├── static/
│   └── (Pip illustrations eventually)
├── tailwind.config.js
├── svelte.config.js
├── vite.config.ts
├── tsconfig.json
└── package.json
```

### Nightly Batch Pseudocode

```typescript
// src/lib/server/batch.ts
import { Cron } from 'croner'; // or use Bun.cron syntax

export function startNightlyBatch() {
  // Run at midnight
  Cron('0 0 * * *', async () => {
    console.log("🗞️ Pip's starting his rounds...");
    
    const tomorrow = getDateString(addDays(new Date(), 1));
    
    // 1. Fetch all RSS feeds
    const sources = await db.source.findMany({ where: { enabled: true } });
    const articles = [];
    for (const source of sources) {
      const newArticles = await fetchRSS(source);
      articles.push(...newArticles);
    }
    
    // 2. Dedupe (by URL)
    const uniqueArticles = dedupeByUrl(articles);
    
    // 3. Save to database
    await saveArticles(uniqueArticles);
    
    // 4. Score and rank
    const prefs = await db.userPreferences.findFirst();
    const scored = scoreArticles(uniqueArticles, prefs);
    
    // 5. Select top 24
    const selected = scored.slice(0, 24);
    
    // 6. Generate crayon drawings for image-less articles
    for (const article of selected) {
      if (!article.heroImageUrl) {
        article.crayonImageUrl = await generateCrayon(article.title);
        article.displayMode = 'crayon';
      }
    }
    
    // 7. Create daily slots (10 at hour 0, then 2 per hour)
    await createDailySlots(tomorrow, selected);
    
    // 8. Generate Pip's briefing
    const top3 = selected.slice(0, 3);
    const briefing = await generateBriefing(top3);
    await db.dailyBriefing.create({
      data: {
        date: new Date(tomorrow),
        pipSummary: briefing,
        featuredArticleIds: JSON.stringify(top3.map(a => a.id)),
      }
    });
    
    console.log("🗞️ All done! Pip's having a rest.");
  });
}
```

## Success Metrics

- You actually use it daily
- You feel informed without feeling overwhelmed
- Average session < 15 minutes
- No anxiety about "missing" stories
- Visual design brings you joy

---

## Document History

- **v0.8** (2026-02-16): Added Docker deployment for Synology NAS (Dockerfile, docker-compose, entrypoint). Switched SvelteKit to adapter-node. Added `DOCKER.md` with deployment instructions.
- **v0.7** (2026-01-01): Removed OPML import, added category-based feed management. Updated Phase 1 status to reflect completed tasks: SvelteKit + Prisma 7 initialized, category-based settings UI completed.
- **v0.6**: Added implementation notes, Prisma schema, file structure, batch pseudocode
- **Earlier versions**: Initial design document with Pip character, product philosophy, and technical architecture
