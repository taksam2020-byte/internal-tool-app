import { NextResponse } from 'next/server';
import { openDb } from '@/lib/db';

export async function GET() {
  try {
    const db = await openDb();
    const users = await db.all('SELECT * FROM users ORDER BY name');
    await db.close();
    return NextResponse.json(users);
  } catch (error) {
    console.error('Failed to get users:', error);
    return NextResponse.json({ message: 'Error fetching users' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const { name } = await request.json();

  if (!name) {
    return NextResponse.json({ message: 'Name is required' }, { status: 400 });
  }

  try {
    const db = await openDb();
    // Use a prepared statement to prevent SQL injection
    const result = await db.run('INSERT INTO users (name) VALUES (?)', [name]);
    await db.close();
    return NextResponse.json({ id: result.lastID, name });
  } catch (error: any) {
    if (error.code === 'SQLITE_CONSTRAINT') {
      return NextResponse.json({ message: 'User with this name already exists' }, { status: 409 });
    }
    console.error('Failed to create user:', error);
    return NextResponse.json({ message: 'Error creating user' }, { status: 500 });
  }
}
