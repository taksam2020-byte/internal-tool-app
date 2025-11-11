import { NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';

export const revalidate = 0; // Disable cache for this route

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type');
  const status = searchParams.get('status');

  try {
    let query = 'SELECT * FROM applications';
    const whereClauses = [];
    const queryParams = [];
    let paramIndex = 1;

    if (type) {
      const types = type.split(',');
      whereClauses.push(`application_type IN (${types.map(() => `$${paramIndex++}`).join(',')})`);
      queryParams.push(...types);
    }

    if (status) {
      whereClauses.push(`status = $${paramIndex++}`);
      queryParams.push(status);
    }

    if (whereClauses.length > 0) {
      query += ` WHERE ${whereClauses.join(' AND ')}`;
    }
    
    query += ' ORDER BY submitted_at DESC';

    const { rows } = await sql.query(query, queryParams);
    
    return NextResponse.json(rows);
  } catch (error) {
    console.error('API Error:', error);
    const message = error instanceof Error ? error.message : 'An unknown error occurred';
    return NextResponse.json({ message: 'Error fetching applications', error: message }, { status: 500 });
  }
}
