# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

```bash
npm install      # Install dependencies
npm run dev      # Start dev server on port 3000
npm run build    # Production build
npm run preview  # Preview production build
```

## Environment Setup

Set `GEMINI_API_KEY` in `.env.local` for the Gemini AI service (optional - app uses programmatic parser by default).

## Architecture

This is a React/TypeScript app built with Vite that parses LTA (Lawn Tennis Association) tournament PDF calendars for Sussex tennis clubs.

### Data Flow

1. **PDF Upload** (`App.tsx`) - User uploads LTA tournament calendar PDF
2. **Text Extraction** (`services/pdfService.ts`) - Uses pdf.js (loaded via CDN in index.html) to extract text
3. **Parsing** (`services/parserService.ts`) - Programmatic regex-based parser extracts Sussex tournaments (codes starting with "SUS-")
4. **Display** - Four tabs: Upload, All Events table, Sussex Map, Club Export (St Ann's filtered view)

### Key Services

- **parserService.ts**: Core parser using regex patterns to extract tournament details (code, gender, grade, date, venue, deadlines) from multi-column PDF text. Filters for Sussex (SUS-*) tournaments only.
- **geminiService.ts**: Alternative AI-based parser using Google Gemini (not used by default)
- **pdfService.ts**: Wrapper around pdf.js for text extraction

### Types

`Tournament` interface in `types.ts` defines: id, title, gender, eventType, grade, venue, postcode, ltaCode, date, month, category, organiserEmail, deadlineCD, deadlineWD.

### Constants

`constants.ts` contains club name ("St Ann's Wells Tennis Club") and mock venue coordinates for the map view.

### UI Pattern

Single-page app with tab navigation. Filters (month, gender, grade, event type, age group) apply across all views. Uses Tailwind CSS classes and lucide-react icons.
