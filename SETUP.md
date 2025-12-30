# Setup Instructions

## Database Initialization

Before running the dev server, you need to initialize the database:

```bash
# Generate Prisma client
bun prisma generate

# Create database and tables
bun prisma db push
```

This will create `prisma/newsboy.db` with all necessary tables.

## Testing OPML Import

1. Start the dev server:
   ```bash
   bun dev
   ```

2. Visit http://localhost:5173

3. Click "Settings" button

4. Upload the `sample-feeds.opml` file included in the repository

5. You should see a success message with the number of feeds imported

6. The feeds list will display all imported sources

## What's Been Implemented

### Step 3: OPML Import ✅

- **OPML parser** (`src/lib/server/opml.ts`):
  - Parses OPML XML files
  - Extracts feed URLs and metadata
  - Detects content type (article vs webcomic) based on keywords
  - Imports feeds into database
  - Handles duplicates (skips existing feeds)

- **API endpoints** (`src/routes/api/sources/`):
  - `GET /api/sources` - List all sources
  - `POST /api/sources/import` - Upload and import OPML file
  - `PUT /api/sources/[id]` - Toggle source enabled/disabled
  - `DELETE /api/sources/[id]` - Delete a source

- **Settings UI** (`src/routes/settings/+page.svelte`):
  - File upload for OPML files
  - Success/error messages
  - List of all sources with:
    - Name and feed URL
    - Content type badge (article/webcomic)
    - Enable/disable toggle
    - Delete button
  - Real-time updates after import

- **Sample OPML file** (`sample-feeds.opml`):
  - 10 diverse feeds covering:
    - Technology (Hacker News, Ars Technica, The Verge)
    - Comics (xkcd, SMBC, Dinosaur Comics)
    - Science (ScienceDaily, Phys.org)
    - Maker/DIY (Hackaday, Make:)

## Next Steps

After testing OPML import, the next phase is:

**Step 4: RSS fetching and article storage**
- RSS feed parsing
- Article extraction
- Image detection
- Database storage
- Deduplication

See `CLAUDE.md` for the full implementation roadmap.
