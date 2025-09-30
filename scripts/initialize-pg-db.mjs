import { sql } from '@vercel/postgres';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function setup() {
  console.log('Running Postgres database setup...');

  // Create users table
  await sql`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL UNIQUE
    );
  `;
  console.log('Table "users" created or already exists.');

  // Create evaluations table
  await sql`
    CREATE TABLE IF NOT EXISTS evaluations (
      id SERIAL PRIMARY KEY,
      evaluator_name VARCHAR(255) NOT NULL,
      target_employee_name VARCHAR(255) NOT NULL,
      evaluation_month VARCHAR(7) NOT NULL,
      total_score INTEGER NOT NULL,
      comment TEXT,
      scores_json JSONB, -- Use JSONB for better performance
      submitted_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
  `;
  console.log('Table "evaluations" created or already exists.');

  // Create proposals table
  await sql`
    CREATE TABLE IF NOT EXISTS proposals (
      id SERIAL PRIMARY KEY,
      proposer_name VARCHAR(255) NOT NULL,
      proposal_year VARCHAR(4) NOT NULL,
      subject TEXT NOT NULL,
      body TEXT NOT NULL,
      submitted_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
  `;
  console.log('Table "proposals" created or already exists.');

  // Seed initial users
  const { rows: existingUsers } = await sql`SELECT name FROM users`;
  const userNames = new Set(existingUsers.map(u => u.name));
  const initialUsers = ['山田 太郎', '鈴木 一郎'];
  for (const user of initialUsers) {
      if (!userNames.has(user)) {
          await sql`INSERT INTO users (name) VALUES (${user});`;
          console.log(`Seeded user: ${user}`);
      }
  }

  console.log('Database setup complete.');
}

setup().catch(err => {
  console.error('Database setup failed:', err);
  process.exit(1);
});
