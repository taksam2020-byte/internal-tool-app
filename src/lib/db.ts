import { open } from 'sqlite';
import sqlite3 from 'sqlite3';
import path from 'path';
import fs from 'fs';

// Use /tmp on Vercel, which is writable
const DB_PATH = process.env.VERCEL 
    ? path.join('/tmp', 'database.db') 
    : path.join(process.cwd(), 'data', 'database.db');

// If we are on Vercel, the DB file in the repo is read-only.
// We need to copy it to a writable location on first invocation.
if (process.env.VERCEL && !fs.existsSync(DB_PATH)) {
    try {
        const repoDbPath = path.join(process.cwd(), 'data', 'database.db');
        if (fs.existsSync(repoDbPath)) {
            console.log(`Copying database from ${repoDbPath} to ${DB_PATH}...`);
            fs.copyFileSync(repoDbPath, DB_PATH);
            console.log('Database copied successfully.');
        }
    } catch (error) {
        console.error("Failed to copy database:", error);
    }
}

// Centralized database connection helper
export async function openDb() {
  return open({
    filename: DB_PATH,
    driver: sqlite3.Database
  });
}
