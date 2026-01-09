# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Frontend (React/Vite)
```bash
npm install      # Install dependencies
npm run dev      # Start dev server on port 3000
npm run build    # Production build
npm run preview  # Preview production build
```

### Backend (Express/SQLite)
```bash
cd server
npm install      # Install dependencies
npm run dev      # Start API server on port 3001 (with hot reload via tsx)
npm run build    # Compile TypeScript to dist/
npm start        # Run production build
```

### Full-Stack Development
Run both servers simultaneously in separate terminals:
- Frontend: `npm run dev` (port 3000)
- Backend: `cd server && npm run dev` (port 3001)

## Environment Setup

**Frontend** (`.env.local`):
- `GEMINI_API_KEY` - Optional, for AI-based parser (not used by default)
- `VITE_API_URL` - Backend API URL (defaults to `http://localhost:3001`)

**Backend** (`server/`):
- `PORT` - Server port (defaults to 3001)
- `DATA_DIR` - SQLite database directory (defaults to `./data`)
- `FRONTEND_URL` - For CORS configuration

## Architecture

Full-stack app for parsing LTA (Lawn Tennis Association) tournament PDF calendars for Sussex tennis clubs.

### Frontend (React/TypeScript/Vite)
- **App.tsx** - Main component with tab navigation, filters, sortable tables
- **services/apiService.ts** - API client for backend communication
- **services/parserService.ts** - Client-side regex parser (backup/testing)
- **services/pdfService.ts** - pdf.js wrapper for text extraction
- **types.ts** - Tournament interface and type definitions

### Backend (Express/SQLite)
- **server/index.ts** - Express API server with routes
- **server/db.ts** - SQLite database with better-sqlite3, prepared statements
- **server/parser.ts** - Server-side tournament parser (filters for SUS-* codes)
- **server/pdfService.ts** - Server-side PDF text extraction

### Data Flow
1. User uploads PDF via frontend
2. Frontend sends PDF to `POST /api/tournaments/upload`
3. Backend extracts text, parses tournaments, stores in SQLite
4. Duplicates auto-skipped (uses composite unique ID: code-gender-eventType-category)
5. Frontend fetches and displays from `GET /api/tournaments`

### API Endpoints
- `GET /api/tournaments` - List all tournaments
- `POST /api/tournaments/upload` - Upload PDF (multipart/form-data)
- `DELETE /api/tournaments/:id` - Delete single tournament
- `DELETE /api/tournaments` - Delete all tournaments
- `GET /health` - Health check with tournament count

## Deployment

**Backend**: Fly.io (`server/fly.toml`)
- App: `ltaparser`
- URL: `https://ltaparser.fly.dev`
- Uses persistent volume `lta_data` for SQLite

```bash
cd server
fly deploy --ha=false
```

**Frontend**: Vercel
- Set `VITE_API_URL=https://ltaparser.fly.dev` in Vercel environment variables
- Redeploy after changing env vars

## Parser Logic

The parser (`server/parser.ts`) extracts Sussex tournaments using:
- LTA codes matching `SUS-XX-XXXX` pattern
- Category headers (8U-18U Boys/Girls, Open Men/Women)
- Regex extraction for: gender, event type, grade, date, venue, deadlines, email
- Composite unique IDs prevent duplicates with same code but different gender/event type
