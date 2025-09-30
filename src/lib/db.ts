import { open } from 'sqlite';
import sqlite3 from 'sqlite3';
import path from 'path';

// Centralized database connection helper
export async function openDb() {
  return open({
    filename: path.join(process.cwd(), 'data', 'database.db'),
    driver: sqlite3.Database
  });
}
