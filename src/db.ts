import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const DB_DIR = path.resolve(process.cwd(), 'data');
if (!fs.existsSync(DB_DIR)) {
  fs.mkdirSync(DB_DIR, { recursive: true });
}

const db = new Database(path.join(DB_DIR, 'scad.db'));

// Enable WAL mode for better concurrency
db.pragma('journal_mode = WAL');

export function initDb() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS files (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      content TEXT,
      type TEXT DEFAULT 'scad',
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS renders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      filename TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(user_id) REFERENCES users(id)
    );
  `);

  const migrationPath = path.resolve(process.cwd(), 'src/migrations/001_calculator_tables.sql');
  if (fs.existsSync(migrationPath)) {
      const migration = fs.readFileSync(migrationPath, 'utf8');
      db.exec(migration);
  }

  // Ensure 'type' column exists in files (migration for existing DBs)
  try {
      db.exec("ALTER TABLE files ADD COLUMN type TEXT DEFAULT 'scad'");
  } catch (e) {}

  try {
      db.exec("ALTER TABLE files ADD COLUMN shared_token TEXT UNIQUE");
  } catch (e) {}

  // Data Migration: Fix types based on extensions for existing files
  try {
      db.prepare("UPDATE files SET type = 'stl' WHERE type = 'scad' AND name LIKE '%.stl'").run();
      db.prepare("UPDATE files SET type = 'obj' WHERE type = 'scad' AND name LIKE '%.obj'").run();
      db.prepare("UPDATE files SET type = '3mf' WHERE type = 'scad' AND name LIKE '%.3mf'").run();
  } catch (e) {
      console.error("Data migration failed:", e);
  }

  console.log('Database initialized');
}

export default db;
