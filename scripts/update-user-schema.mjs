import { sql } from '@vercel/postgres';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function updateUserSchema() {
  console.log('Updating users table schema...');
  try {
    await sql`DROP TABLE IF EXISTS users;`;
    console.log('Dropped existing users table.');

    await sql`
      CREATE TABLE users (
        id INT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        role VARCHAR(50) DEFAULT '内勤' NOT NULL, -- '社長', '営業', '内勤'
        is_trainee BOOLEAN DEFAULT FALSE NOT NULL,
        is_active BOOLEAN DEFAULT TRUE NOT NULL
      );
    `;
    console.log('Created new users table with id, name, role, is_trainee, and is_active columns.');

  } catch (error) {
    console.error('Failed to update user schema:', error);
    process.exit(1);
  }
}

updateUserSchema();