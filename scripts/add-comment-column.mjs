import { sql } from '@vercel/postgres';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function addCommentColumn() {
  console.log('Adding comment column to evaluations table...');
  try {
    await sql`ALTER TABLE evaluations ADD COLUMN comment TEXT;`;
    console.log('"comment" column added successfully.');
  } catch (error) {
    if (error.message.includes('column "comment" of relation "evaluations" already exists')) {
      console.log('"comment" column already exists. No changes made.');
    } else {
      console.error('Failed to add column:', error);
      process.exit(1);
    }
  }
}

addCommentColumn();
