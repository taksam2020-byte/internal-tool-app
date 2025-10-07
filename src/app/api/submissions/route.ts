import { NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type');
  const year = searchParams.get('year');

  try {
    let query;
    if (type === 'evaluations') {
      query = sql`SELECT id, submitted_at, evaluator_name, target_employee_name FROM evaluations ORDER BY submitted_at DESC;`;
    } else if (type === 'proposals') {
      if (year) {
        query = sql`SELECT id, submitted_at, proposer_name, event_name FROM proposals WHERE proposal_year = ${year} ORDER BY submitted_at DESC;`;
      } else {
        query = sql`SELECT id, submitted_at, proposer_name, event_name FROM proposals ORDER BY submitted_at DESC;`;
      }
    } else {
      return NextResponse.json({ message: 'Invalid type' }, { status: 400 });
    }
    const { rows } = await query;
    return NextResponse.json(rows);
  } catch (error) {
    console.error(`Failed to get ${type}:`, error);
    return NextResponse.json({ message: `Error fetching ${type}` }, { status: 500 });
  }
}

// ... DELETE function remains the same