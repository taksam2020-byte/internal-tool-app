import { NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const selectedMonth = body.month;

        if (!selectedMonth) {
            return NextResponse.json({ error: 'Month parameter is required' }, { status: 400 });
        }

        const searchPattern = selectedMonth + '%';
        const { rows } = await sql`
            SELECT COUNT(*) FROM evaluations 
            WHERE CAST(submitted_at AS TEXT) LIKE ${searchPattern}`;

        const count = rows[0].count;

        return NextResponse.json({ selectedMonth, count });

    } catch (error) {
        console.error('Test API Error:', error);
        return NextResponse.json({ message: 'Error fetching test data', error: (error as Error).message }, { status: 500 });
    }
}
