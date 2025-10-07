import { NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';

export async function GET() {
  try {
    const { rows: users } = await sql`SELECT id, name, role, is_trainee, is_active FROM users ORDER BY id;`;
    return NextResponse.json(users);
  } catch (error) {
    console.error('Failed to get users:', error);
    return NextResponse.json({ message: 'Error fetching users' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { id, name, role, is_trainee } = await request.json();
    if (!id || !name) {
      return NextResponse.json({ message: 'ID and Name are required' }, { status: 400 });
    }
    
    const { rows: existing } = await sql`SELECT id FROM users WHERE id = ${id}`;
    if (existing.length > 0) {
        return NextResponse.json({ message: 'このIDは既に使用されています。' }, { status: 409 });
    }

    await sql`INSERT INTO users (id, name, role, is_trainee) VALUES (${id}, ${name}, ${role}, ${is_trainee});`;
    const { rows: users } = await sql`SELECT * FROM users WHERE id = ${id};`;
    return NextResponse.json(users[0], { status: 201 });
  } catch (error: unknown) {
     if (error && typeof error === 'object' && 'code' in error && error.code === '23505') { // unique_violation
      return NextResponse.json({ message: 'このIDは既に使用されています。' }, { status: 409 });
    }
    console.error('Failed to create user:', error);
    return NextResponse.json({ message: 'Error creating user' }, { status: 500 });
  }
}