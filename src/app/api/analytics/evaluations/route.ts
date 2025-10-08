import { NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';

const evaluationItemKeys = ['accuracy', 'discipline', 'cooperation', 'proactiveness', 'agility', 'judgment', 'expression', 'comprehension', 'interpersonal', 'potential'];
const evaluationItemLabels: { [key: string]: string } = { accuracy: '正確性', discipline: '規律性', cooperation: '協調性', proactiveness: '積極性', agility: '俊敏性', judgment: '判断力', expression: '表現力', comprehension: '理解力', interpersonal: '対人性', potential: '将来性' };
const MAX_TOTAL_SCORE = 55;

interface UserFromDb { id: number; name: string; }
interface EvaluationFromDb { evaluator_name: string; scores_json: { [key: string]: number }; total_score: number; comment: string | null; }

const formatMonth = (ym: string | null, format: 'long' | 'short') => {
    if (!ym) return '';
    const [year, month] = ym.split('-');
    return format === 'long' ? `${year}年${parseInt(month, 10)}月度` : `${parseInt(month, 10)}月`;
};

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const selectedMonth = searchParams.get('month');
        const selectedTarget = searchParams.get('target');

        // --- 1. Get Filter Options (always runs)
        const allEvalsResult = await sql<{ submitted_at: string; target_employee_name: string; }>`SELECT DISTINCT to_char(submitted_at, 'YYYY-MM') as submitted_at, target_employee_name FROM evaluations;`;
        const sortedMonths = [...new Set(allEvalsResult.rows.map(e => e.submitted_at))].sort((a, b) => b.localeCompare(a));
        const sortedTargets = [...new Set(allEvalsResult.rows.map(e => e.target_employee_name))].sort();
        const filterOptions = { months: sortedMonths, targets: sortedTargets };

        // If no params, return only filter options
        if (!selectedMonth || !selectedTarget) {
            return NextResponse.json({ filterOptions });
        }

        // --- 2. Fetch Data for the specific Month & Target
        const firstDay = new Date(selectedMonth + '-01');
        const lastDay = new Date(firstDay.getFullYear(), firstDay.getMonth() + 1, 0);
        
        const { rows: potentialEvaluators } = await sql<UserFromDb>`SELECT id, name FROM users WHERE is_active = TRUE AND role IN ('内勤', '営業', '社長') ORDER BY id ASC;`;
        const { rows: evaluationsForMonth } = await sql<EvaluationFromDb>`
            SELECT * FROM evaluations 
            WHERE target_employee_name = ${selectedTarget} 
            AND submitted_at >= ${firstDay.toISOString()} AND submitted_at < ${new Date(lastDay.getTime() + 86400000).toISOString()}`;

        // --- 3. Process CrossTab Data
        const crossTabHeaders = ['採点者', ...evaluationItemKeys.map(k => evaluationItemLabels[k]), '合計点'];
        const crossTabRows = potentialEvaluators.map(user => {
            const evaluation = evaluationsForMonth.find(e => e.evaluator_name === user.name);
            const row: { [key: string]: string | number } = { '採点者': user.name };
            if (evaluation) {
                evaluationItemKeys.forEach(key => { row[evaluationItemLabels[key]] = evaluation.scores_json[key] || 0; });
                row['合計点'] = evaluation.total_score;
            } else {
                evaluationItemKeys.forEach(key => { row[evaluationItemLabels[key]] = '-'; });
                row['合計点'] = '-';
            }
            return row;
        });
        const submittedRows = crossTabRows.filter(r => r['合計点'] !== '-');
        const numEvaluators = submittedRows.length;
        const crossTabAverages = { '採点者': '平均点' } as { [key: string]: string | number };
        let grandTotal = 0;
        if (numEvaluators > 0) {
            const itemTotals = evaluationItemKeys.reduce((acc, key) => ({ ...acc, [evaluationItemLabels[key]]: 0 }), {} as { [key: string]: number });
            submittedRows.forEach(row => {
                evaluationItemKeys.forEach(key => { itemTotals[evaluationItemLabels[key]] += Number(row[evaluationItemLabels[key]]); });
                grandTotal += Number(row['合計点']);
            });
            evaluationItemKeys.forEach(key => { crossTabAverages[evaluationItemLabels[key]] = parseFloat((itemTotals[evaluationItemLabels[key]] / numEvaluators).toFixed(1)); });
            crossTabAverages['合計点'] = parseFloat((grandTotal / numEvaluators).toFixed(1));
        }

        // --- 4. Process Comments
        const comments = evaluationsForMonth.map(e => ({ evaluator: e.evaluator_name, comment: e.comment || 'コメントはありません。' })).sort((a, b) => a.evaluator.localeCompare(b.evaluator));

        // --- 5. Process Monthly Summary (Only for the selected month)
        const monthlySummaryRaw = numEvaluators > 0 ? [{
            month: formatMonth(selectedMonth, 'short'),
            ...evaluationItemKeys.reduce((acc, key) => ({ ...acc, [evaluationItemLabels[key]]: crossTabAverages[evaluationItemLabels[key]] }), {}),
            '合計': crossTabAverages['合計点']
        }] : [];

        // --- 6. Process Radar Chart Data
        const eChartsIndicator = evaluationItemKeys.map(key => ({ name: evaluationItemLabels[key], max: key === 'potential' ? 10 : 5 }));
        const currentMonthValues = evaluationItemKeys.map(key => {
            const avg = crossTabAverages[evaluationItemLabels[key]] as number || 0;
            return key === 'potential' ? avg / 2 : avg;
        });

        // --- 7. Fetch and Process Cumulative Data
        const { rows: targetEvalsAllMonths } = await sql<EvaluationFromDb>`SELECT * FROM evaluations WHERE target_employee_name = ${selectedTarget};`;
        const cumulativeValues = evaluationItemKeys.map(key => {
            const total = targetEvalsAllMonths.reduce((sum, e) => sum + (e.scores_json[key] || 0), 0);
            const avg = targetEvalsAllMonths.length > 0 ? total / targetEvalsAllMonths.length : 0;
            return key === 'potential' ? avg / 2 : avg;
        });

        // --- 8. Final JSON Response
        return NextResponse.json({
            crossTabData: { headers: crossTabHeaders, rows: crossTabRows, averages: crossTabAverages },
            comments,
            monthlySummary: { labels: [], datasets: [], rawData: monthlySummaryRaw }, // Graph data can be derived on frontend or simplified here
            eChartsRadarData: {
                indicator: eChartsIndicator,
                current: numEvaluators > 0 ? [{ value: currentMonthValues, name: '当月平均点' }] : [],
                cumulative: targetEvalsAllMonths.length > 0 ? [{ value: cumulativeValues.map(v => parseFloat(v.toFixed(1))), name: '累計平均点' }] : []
            },
            currentMonthAverage: numEvaluators > 0 ? (grandTotal / numEvaluators / MAX_TOTAL_SCORE * 100).toFixed(1) : "0.0",
            cumulativeAverage: targetEvalsAllMonths.length > 0 ? (targetEvalsAllMonths.reduce((sum, e) => sum + e.total_score, 0) / targetEvalsAllMonths.length / MAX_TOTAL_SCORE * 100).toFixed(1) : "0.0",
            filterOptions,
            selectedMonth,
            selectedMonthLong: formatMonth(selectedMonth, 'long')
        });

    } catch (error) {
        console.error('Analytics API Error:', error);
        return NextResponse.json({ message: 'Error fetching analytics data', error: (error as Error).message }, { status: 500 });
    }
}