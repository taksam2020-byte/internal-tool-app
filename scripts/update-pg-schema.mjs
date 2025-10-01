import { sql } from '@vercel/postgres';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function updateSchema() {
  console.log('Running Postgres schema update...');

  // Drop the old proposals table
  await sql`DROP TABLE IF EXISTS proposals;`;
  console.log('Old "proposals" table dropped.');

  // Create a new proposals table to store each proposal item individually
  await sql`
    CREATE TABLE proposals (
      id SERIAL PRIMARY KEY,
      proposer_name VARCHAR(255) NOT NULL,
      proposal_year VARCHAR(4) NOT NULL,
      event_name VARCHAR(255) NOT NULL, -- New field
      timing VARCHAR(255) NOT NULL,
      type VARCHAR(255) NOT NULL,
      content TEXT NOT NULL,
      submitted_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
  `;
  console.log('New "proposals" table created.');

  console.log('Schema update complete.');
}

updateSchema().catch(err => {
  console.error('Schema update failed:', err);
  process.exit(1);
});
