import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import path from 'path';
import fs from 'fs';

// --- Database setup ---
// This script creates the database file and the necessary tables.

async function setup() {
  // Ensure the data directory exists
  const dataDir = path.join(process.cwd(), 'data');
  if (!fs.existsSync(dataDir)) {
    console.log('Creating data directory...');
    fs.mkdirSync(dataDir, { recursive: true });
  }

  const db = await open({
    filename: path.join(dataDir, 'database.db'),
    driver: sqlite3.Database
  });

  console.log('Running database migrations...');

  await db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE
    );
  `);

  await db.exec(`
    CREATE TABLE IF NOT EXISTS evaluations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      evaluator_name TEXT NOT NULL,
      target_employee_name TEXT NOT NULL,
      evaluation_month TEXT NOT NULL,
      total_score INTEGER NOT NULL,
      comment TEXT,
      scores_json TEXT, -- Store scores object as JSON
      submitted_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  await db.exec(`
    CREATE TABLE IF NOT EXISTS proposals (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      proposer_name TEXT NOT NULL,
      proposal_year TEXT NOT NULL,
      subject TEXT NOT NULL,
      body TEXT NOT NULL,
      submitted_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Seed with some initial users if the table is empty
  const userCount = await db.get('SELECT COUNT(*) as count FROM users');
  if (userCount.count === 0) {
      console.log('Seeding initial users...');
      await db.run("INSERT INTO users (name) VALUES (?)", ['山田 太郎']);
      await db.run("INSERT INTO users (name) VALUES (?)", ['鈴木 一郎']);
  }

  console.log('Database setup complete.');

  const users = await db.all('SELECT * FROM users');
  console.log('Current users:', users);

  await db.close();
}

setup().catch(err => {
  console.error('Database setup failed:', err);
  process.exit(1);
});
