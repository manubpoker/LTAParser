import express from 'express';
import cors from 'cors';
import multer from 'multer';
import {
  getAllTournaments,
  insertTournaments,
  deleteTournament,
  deleteAllTournaments,
  getTournamentCount,
  Tournament
} from './db.js';
import { extractTextFromPdf } from './pdfService.js';
import { parseTournamentsProgrammatically } from './parser.js';

const app = express();
const PORT = process.env.PORT || 3001;

// Configure multer for file uploads (store in memory)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB max
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are allowed'));
    }
  }
});

// CORS configuration - allow frontend origins
app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps or curl)
    if (!origin) return callback(null, true);
    // Allow any localhost port for development
    if (origin.startsWith('http://localhost:')) {
      return callback(null, true);
    }
    // Allow any vercel.app domain
    if (origin.includes('.vercel.app')) {
      return callback(null, true);
    }
    // Allow configured frontend URL
    if (process.env.FRONTEND_URL && origin.startsWith(process.env.FRONTEND_URL)) {
      return callback(null, true);
    }
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true
}));

app.use(express.json());

// Root endpoint - helpful message
app.get('/', (req, res) => {
  res.json({
    name: 'LTA Parser API',
    status: 'running',
    tournamentCount: getTournamentCount(),
    endpoints: {
      'GET /api/tournaments': 'Get all tournaments',
      'POST /api/tournaments/upload': 'Upload PDF to parse tournaments',
      'DELETE /api/tournaments/:id': 'Delete a tournament',
      'DELETE /api/tournaments': 'Delete all tournaments'
    },
    note: 'This is the API server. The frontend runs on a separate port (default: 3000)'
  });
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', tournamentCount: getTournamentCount() });
});

// Get all tournaments
app.get('/api/tournaments', (req, res) => {
  try {
    const tournaments = getAllTournaments();
    res.json({
      success: true,
      count: tournaments.length,
      tournaments
    });
  } catch (error: any) {
    console.error('Error fetching tournaments:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Upload and parse PDF
app.post('/api/tournaments/upload', upload.single('pdf'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No PDF file provided' });
    }

    console.log(`Processing PDF: ${req.file.originalname} (${req.file.size} bytes)`);

    // Extract text from PDF
    const text = await extractTextFromPdf(req.file.buffer);
    console.log(`Extracted ${text.length} characters from PDF`);

    // Parse tournaments
    const parsed = parseTournamentsProgrammatically(text);
    console.log(`Parsed ${parsed.length} Sussex tournaments from PDF`);

    // Insert into database (duplicates are ignored due to INSERT OR IGNORE)
    const result = insertTournaments(parsed);
    console.log(`Added ${result.added} new tournaments, skipped ${result.skipped} existing`);

    // Get updated list
    const allTournaments = getAllTournaments();

    res.json({
      success: true,
      parsed: parsed.length,
      added: result.added,
      skipped: result.skipped,
      total: allTournaments.length,
      tournaments: allTournaments
    });
  } catch (error: any) {
    console.error('Error processing PDF:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Delete a specific tournament
app.delete('/api/tournaments/:id', (req, res) => {
  try {
    const { id } = req.params;
    const deleted = deleteTournament(id);

    if (deleted) {
      res.json({ success: true, message: `Tournament ${id} deleted` });
    } else {
      res.status(404).json({ success: false, error: 'Tournament not found' });
    }
  } catch (error: any) {
    console.error('Error deleting tournament:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Delete all tournaments
app.delete('/api/tournaments', (req, res) => {
  try {
    const count = deleteAllTournaments();
    res.json({ success: true, message: `Deleted ${count} tournaments` });
  } catch (error: any) {
    console.error('Error deleting tournaments:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`LTA Parser API server running on port ${PORT}`);
  console.log(`Database contains ${getTournamentCount()} tournaments`);
});
