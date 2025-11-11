
import { NextResponse, NextRequest } from 'next/server';
import { sql } from '@vercel/postgres';

export async function PUT(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const body = await request.json();
    const { status, processed_by } = body;

    // Case 1: Only updating the processor
    if (processed_by && !status) {
        await sql`
            UPDATE applications
            SET processed_by = ${processed_by}
            WHERE id = ${id};
        `;
        return NextResponse.json({ message: 'Application processor updated successfully' }, { status: 200 });
    }

    // Case 2: Updating the status
    if (!status) {
        return NextResponse.json({ message: 'Status field is required for status updates.' }, { status: 400 });
    }
    
    // Validation: '処理済み' or 'キャンセル' status requires a processor
    if ((status === '処理済み' || status === 'キャンセル') && !processed_by) {
        return NextResponse.json({ message: `ステータスが「${status}」の場合、処理者名は必須です。` }, { status: 400 });
    }

    if (status === '未処理') {
        await sql`
            UPDATE applications
            SET status = ${status}, processed_by = NULL, processed_at = NULL
            WHERE id = ${id};
        `;
    } else if (status === '処理済み') {
        await sql`
            UPDATE applications
            SET status = ${status}, processed_by = ${processed_by}, processed_at = CURRENT_TIMESTAMP
            WHERE id = ${id};
        `;
    } else { // For 'キャンセル' and any other potential statuses
        await sql`
            UPDATE applications
            SET status = ${status}, processed_by = ${processed_by}, processed_at = NULL
            WHERE id = ${id};
        `;
    }

    return NextResponse.json({ message: 'Application status updated successfully' }, { status: 200 });
  } catch (error: unknown) {
    console.error('API Error:', error);
    const message = error instanceof Error ? error.message : 'An unknown error occurred';
    return NextResponse.json({ message: 'Error updating application status', error: message }, { status: 500 });
  }
}
