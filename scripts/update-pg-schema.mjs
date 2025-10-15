import { sql } from '@vercel/postgres';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function updateSchema() {
  console.log('Running Postgres schema update...');

  // Create a new applications table if it doesn't exist
  await sql`
    CREATE TABLE IF NOT EXISTS applications (
      id SERIAL PRIMARY KEY,
      application_type VARCHAR(255) NOT NULL,
      applicant_name VARCHAR(255) NOT NULL,
      title VARCHAR(255) NOT NULL,
      details JSONB NOT NULL,
      submitted_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      status VARCHAR(255) NOT NULL DEFAULT '未処理',
      processed_by VARCHAR(255),
      processed_at TIMESTAMP
    );
  `;
  console.log('Table "applications" created or already exists.');

  console.log('Schema update complete.');
}

updateSchema().catch(err => {
  console.error('Schema update failed:', err);
  process.exit(1);
});
