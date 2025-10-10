import { NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';

// --- Constants ---
const evaluationItemKeys = ['accuracy', 'discipline', 'cooperation', 'proactiveness', 'agility', 'judgment', 'expression', 'comprehension', 'interpersonal', 'potential'];
const evaluationItemLabels: { [key: string]: string } = { accuracy: '正確性', discipline: '規律性', cooperation: '協調性', proactiveness: '積極性', agility: '俊敏性', judgment: '判断力', expression: '表現力', comprehension: '理解力', interpersonal: '対人性', potential: '将来性' };
const MAX_TOTAL_SCORE = 55;

// --- Type Definitions ---
interface UserFromDb { id: number; name: string; }
interface EvaluationFromDb { evaluator_name: string; scores_json: { [key: string]: number }; total_score: number; comment: string | null; evaluation_month: string; }

// --- Helper Functions ---
const formatMonth = (month: string | null) => {
    if (!month) return '';
    // Assuming month is 'YYYY-MM' format from the database
    const [year, monthNum] = month.split('-');
    return `${year}年${parseInt(monthNum, 10)}月度`;
};

// --- Main API Route Handler ---
export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const selectedTarget = searchParams.get('target');

        // 1. Get Filter Options from evaluation_month
        const allEvalsResult = await sql<{ evaluation_month: string; target_employee_name: string; }>`
            SELECT DISTINCT evaluation_month, target_employee_name FROM evaluations;`;
        const sortedMonths = [...new Set(allEvalsResult.rows.map(e => e.evaluation_month))].sort((a, b) => b.localeCompare(a));
        const sortedTargets = [...new Set(allEvalsResult.rows.map(e => e.target_employee_name))].sort();
        const filterOptions = { months: sortedMonths, targets: sortedTargets };

        if (!selectedTarget) {
            return NextResponse.json({ filterOptions, allEvaluations: [], potentialEvaluators: [] });
        }

        // 2. Fetch all evaluations for the selected target
        const { rows: allEvaluations } = await sql<EvaluationFromDb>`
            SELECT * FROM evaluations WHERE target_employee_name = ${selectedTarget};
        `;

        // 3. Fetch all potential evaluators
        const { rows: potentialEvaluators } = await sql<UserFromDb>`
            SELECT id, name FROM users WHERE is_active = TRUE AND role IN ('内勤', '営業', '社長') ORDER BY id ASC;
        `;

        // 4. Return the raw data
        return NextResponse.json({ 
            filterOptions,
            allEvaluations: allEvaluations.map(e => ({...e, month: e.evaluation_month})), // Add month property for frontend
            potentialEvaluators
        });

    } catch (error) {
        console.error('Simplified API Error:', error);
        return NextResponse.json({ message: 'Error fetching raw data', error: (error as Error).message }, { status: 500 });
    }
}