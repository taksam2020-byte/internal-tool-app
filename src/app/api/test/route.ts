import { NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const selectedMonth = searchParams.get('month');

        if (!selectedMonth) {
            return NextResponse.json({ error: 'Month parameter is required' }, { status: 400 });
        }

        const firstDay = new Date(selectedMonth + '-01');
        const lastDay = new Date(firstDay.getFullYear(), firstDay.getMonth() + 1, 0);

        const { rows } = await sql`
            SELECT COUNT(*) FROM evaluations 
            WHERE submitted_at >= ${firstDay.toISOString()} AND submitted_at < ${new Date(lastDay.getTime() + 86400000).toISOString()}`;

        const count = rows[0].count;

        return NextResponse.json({ selectedMonth, count });

    } catch (error) {
        console.error('Test API Error:', error);
        return NextResponse.json({ message: 'Error fetching test data', error: (error as Error).message }, { status: 500 });
    }
}
