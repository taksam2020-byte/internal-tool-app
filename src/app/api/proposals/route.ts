import { NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { proposerName, proposalYear, proposals } = body;

    if (!proposerName || !proposalYear || !proposals || !Array.isArray(proposals)) {
        return NextResponse.json({ message: 'Missing or invalid required fields' }, { status: 400 });
    }

    // Use a transaction to ensure all proposals are inserted or none are
    for (const proposal of proposals) {
        if (!proposal.eventName || !proposal.timing || !proposal.type || !proposal.content) {
            // Basic validation for each item
            return NextResponse.json({ message: 'All fields in each proposal are required' }, { status: 400 });
        }
        await sql`
          INSERT INTO proposals (proposer_name, proposal_year, event_name, timing, type, content)
          VALUES (${proposerName}, ${proposalYear}, ${proposal.eventName}, ${proposal.timing}, ${proposal.type}, ${proposal.content});
        `;
    }

    return NextResponse.json({ message: 'Proposals submitted successfully' }, { status: 201 });
  } catch (error: unknown) {
    console.error('API Error:', error);
    const message = error instanceof Error ? error.message : 'An unknown error occurred';
    return NextResponse.json({ message: 'Error submitting proposals', error: message }, { status: 500 });
  }
}