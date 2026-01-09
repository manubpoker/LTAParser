import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

// Use data directory for persistence on fly.io
const DATA_DIR = process.env.DATA_DIR || './data';
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const dbPath = path.join(DATA_DIR, 'tournaments.db');
const db = new Database(dbPath);

// Enable WAL mode for better concurrent access
db.pragma('journal_mode = WAL');

// Create tournaments table if it doesn't exist
db.exec(`
  CREATE TABLE IF NOT EXISTS tournaments (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    gender TEXT NOT NULL,
    eventType TEXT NOT NULL,
    grade TEXT NOT NULL,
    venue TEXT NOT NULL,
    postcode TEXT,
    ltaCode TEXT NOT NULL,
    date TEXT NOT NULL,
    month TEXT NOT NULL,
    category TEXT NOT NULL,
    organiserEmail TEXT,
    deadlineCD TEXT,
    deadlineWD TEXT,
    createdAt TEXT DEFAULT (datetime('now')),
    updatedAt TEXT DEFAULT (datetime('now'))
  )
`);

// Create index on ltaCode for faster lookups
db.exec(`CREATE INDEX IF NOT EXISTS idx_ltaCode ON tournaments(ltaCode)`);

export interface Tournament {
  id: string;
  title: string;
  gender: string;
  eventType: string;
  grade: string;
  venue: string;
  postcode: string;
  ltaCode: string;
  date: string;
  month: string;
  category: string;
  organiserEmail: string;
  deadlineCD: string;
  deadlineWD: string;
}

// Prepared statements for better performance
const insertStmt = db.prepare(`
  INSERT OR IGNORE INTO tournaments
  (id, title, gender, eventType, grade, venue, postcode, ltaCode, date, month, category, organiserEmail, deadlineCD, deadlineWD)
  VALUES (@id, @title, @gender, @eventType, @grade, @venue, @postcode, @ltaCode, @date, @month, @category, @organiserEmail, @deadlineCD, @deadlineWD)
`);

const getAllStmt = db.prepare('SELECT * FROM tournaments ORDER BY date ASC');
const getByIdStmt = db.prepare('SELECT * FROM tournaments WHERE id = ?');
const deleteStmt = db.prepare('DELETE FROM tournaments WHERE id = ?');
const deleteAllStmt = db.prepare('DELETE FROM tournaments');
const countStmt = db.prepare('SELECT COUNT(*) as count FROM tournaments');

export function getAllTournaments(): Tournament[] {
  return getAllStmt.all() as Tournament[];
}

export function getTournamentById(id: string): Tournament | undefined {
  return getByIdStmt.get(id) as Tournament | undefined;
}

export function tournamentExists(id: string): boolean {
  return getTournamentById(id) !== undefined;
}

export function insertTournament(tournament: Tournament): boolean {
  const result = insertStmt.run(tournament);
  return result.changes > 0;
}

export function insertTournaments(tournaments: Tournament[]): { added: number; skipped: number } {
  let added = 0;
  let skipped = 0;

  const insertMany = db.transaction((items: Tournament[]) => {
    for (const t of items) {
      const result = insertStmt.run(t);
      if (result.changes > 0) {
        added++;
      } else {
        skipped++;
      }
    }
  });

  insertMany(tournaments);
  return { added, skipped };
}

export function deleteTournament(id: string): boolean {
  const result = deleteStmt.run(id);
  return result.changes > 0;
}

export function deleteAllTournaments(): number {
  const result = deleteAllStmt.run();
  return result.changes;
}

export function getTournamentCount(): number {
  const result = countStmt.get() as { count: number };
  return result.count;
}

export default db;
