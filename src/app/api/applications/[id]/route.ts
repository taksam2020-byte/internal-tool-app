
import { NextResponse, NextRequest } from 'next/server';
import { sql } from '@vercel/postgres';

export async function PUT(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const { status, processed_by } = await request.json();

    if (!status || !processed_by) {
        return NextResponse.json({ message: 'Missing or invalid required fields' }, { status: 400 });
    }

    await sql`
      UPDATE applications
      SET status = ${status}, processed_by = ${processed_by}, processed_at = CURRENT_TIMESTAMP
      WHERE id = ${id};
    `;

    return NextResponse.json({ message: 'Application status updated successfully' }, { status: 200 });
  } catch (error: unknown) {
    console.error('API Error:', error);
    const message = error instanceof Error ? error.message : 'An unknown error occurred';
    return NextResponse.json({ message: 'Error updating application status', error: message }, { status: 500 });
  }
}
