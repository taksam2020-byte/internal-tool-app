import { NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';

// Minimal API to fetch all data for a given target.
// All filtering and processing will be done on the client-side.

interface UserFromDb { id: number; name: string; }

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const selectedTarget = searchParams.get('target');

        // 1. Get all available filter options from the DB
        const allEvalsResult = await sql<{ submitted_at: string; target_employee_name: string; }>`
            SELECT DISTINCT to_char(submitted_at, 'YYYY-MM') as submitted_at, target_employee_name FROM evaluations;`;
        const sortedMonths = [...new Set(allEvalsResult.rows.map(e => e.submitted_at))].sort((a, b) => b.localeCompare(a));
        const sortedTargets = [...new Set(allEvalsResult.rows.map(e => e.target_employee_name))].sort();
        const filterOptions = { months: sortedMonths, targets: sortedTargets };

        // If no target is specified, return only the filter options.
        if (!selectedTarget) {
            return NextResponse.json({ filterOptions, allEvaluations: [], potentialEvaluators: [] });
        }

        // 2. Fetch all evaluations for the selected target
        const { rows: allEvaluations } = await sql`
            SELECT *, to_char(submitted_at, 'YYYY-MM') as month FROM evaluations WHERE target_employee_name = ${selectedTarget};
        `;

        // 3. Fetch all potential evaluators
        const { rows: potentialEvaluators } = await sql<UserFromDb>`
            SELECT id, name FROM users WHERE is_active = TRUE AND role IN ('内勤', '営業', '社長') ORDER BY id ASC;
        `;

        // 4. Return the raw data
        console.log('--- RAW DB DATA ---', JSON.stringify(allEvaluations, null, 2));
        return NextResponse.json({ 
            filterOptions,
            allEvaluations,
            potentialEvaluators
        });

    } catch (error) {
        console.error('Simplified API Error:', error);
        return NextResponse.json({ message: 'Error fetching raw data', error: (error as Error).message }, { status: 500 });
    }
}
