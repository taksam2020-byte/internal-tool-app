import { NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';

export const revalidate = 0; // Disable cache for this route

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type');

  try {
    let query = 'SELECT * FROM applications';
    if (type) {
      const types = type.split(',');
      query += ` WHERE application_type IN (${types.map((_, i) => `$${i + 1}`).join(',')})`;
    }
    query += ' ORDER BY submitted_at DESC';

    const { rows } = await sql.query(query, type ? type.split(',') : []);
    
    return NextResponse.json(rows);
  } catch (error) {
    console.error('API Error:', error);
    const message = error instanceof Error ? error.message : 'An unknown error occurred';
    return NextResponse.json({ message: 'Error fetching applications', error: message }, { status: 500 });
  }
}
