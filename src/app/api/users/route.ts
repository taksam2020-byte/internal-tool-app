import { NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';

export async function GET() {
  try {
    const { rows: users } = await sql`SELECT * FROM users ORDER BY name;`;
    return NextResponse.json(users);
  } catch (error) {
    console.error('Failed to get users:', error);
    return NextResponse.json({ message: 'Error fetching users' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { name } = await request.json();
    if (!name) {
      return NextResponse.json({ message: 'Name is required' }, { status: 400 });
    }
    await sql`INSERT INTO users (name) VALUES (${name});`;
    const { rows: users } = await sql`SELECT * FROM users WHERE name = ${name};`;
    return NextResponse.json(users[0], { status: 201 });
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'code' in error && error.code === '23505') { // 23505 is the code for unique_violation in Postgres
      return NextResponse.json({ message: 'User with this name already exists' }, { status: 409 });
    }
    console.error('Failed to create user:', error);
    return NextResponse.json({ message: 'Error creating user' }, { status: 500 });
  }
}