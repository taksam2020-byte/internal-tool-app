import { NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { proposerName, proposalYear, subject, body: proposalBody } = body;

    if (!proposerName || !proposalYear || !subject || !proposalBody) {
        return NextResponse.json({ message: 'Missing required fields' }, { status: 400 });
    }

    await sql`
      INSERT INTO proposals (proposer_name, proposal_year, subject, body)
      VALUES (${proposerName}, ${proposalYear}, ${subject}, ${proposalBody});
    `;

    return NextResponse.json({ message: 'Proposal submitted successfully' }, { status: 201 });
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json({ message: 'Error submitting proposal' }, { status: 500 });
  }
}