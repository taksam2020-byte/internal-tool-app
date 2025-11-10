
import { NextResponse, NextRequest } from 'next/server';
import { sql } from '@vercel/postgres';

export async function PUT(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const { status, processed_by } = await request.json();

    if (!status || (status === '処理済み' && !processed_by)) {
        return NextResponse.json({ message: 'ステータスが「処理済み」の場合、処理者名は必須です。' }, { status: 400 });
    }

    if (status === '処理済み') {
        await sql`
            UPDATE applications
            SET status = ${status}, processed_by = ${processed_by}, processed_at = CURRENT_TIMESTAMP
            WHERE id = ${id};
        `;
    } else {
        await sql`
            UPDATE applications
            SET status = ${status}, processed_by = NULL, processed_at = NULL
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
