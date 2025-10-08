import { NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';

// Define constants for evaluation items to ensure consistency
const evaluationItemKeys = ['accuracy', 'discipline', 'cooperation', 'proactiveness', 'agility', 'judgment', 'expression', 'comprehension', 'interpersonal', 'potential'];
const evaluationItemLabels: { [key: string]: string } = {
    accuracy: '正確性', discipline: '規律性', cooperation: '協調性', proactiveness: '積極性', agility: '俊敏性',
    judgment: '判断力', expression: '表現力', comprehension: '理解力', interpersonal: '対人性', potential: '将来性'
};
const MAX_TOTAL_SCORE = 55;

// --- Type Definitions ---
interface UserFromDb { id: number; name: string; }
interface EvaluationFromDb { evaluator_name: string; target_employee_name: string; scores_json: { [key: string]: number }; total_score: number; comment: string | null; submitted_at: string; }
interface MonthlyAggregate { itemTotals: { [key: string]: number }; count: number; totalScoreSum: number; }

// --- Helper Functions ---
const formatMonth = (ym: string | null, format: 'long' | 'short') => {
    if (!ym) return '';
    const [year, month] = ym.split('-');
    return format === 'long' ? `${year}年${parseInt(month, 10)}月度` : `${parseInt(month, 10)}月`;
};

// --- Main API Route Handler ---
export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const initialMonth = searchParams.get('month');
        const initialTarget = searchParams.get('target');

        // 1. Get all available filter options from the DB
        const allEvalsResult = await sql<{ submitted_at: string; target_employee_name: string; }>`
            SELECT DISTINCT to_char(submitted_at, 'YYYY-MM') as submitted_at, target_employee_name FROM evaluations;`;
        const sortedMonths = [...new Set(allEvalsResult.rows.map(e => e.submitted_at))].sort((a, b) => b.localeCompare(a));
        const sortedTargets = [...new Set(allEvalsResult.rows.map(e => e.target_employee_name))].sort();
        const filterOptions = { months: sortedMonths, targets: sortedTargets };

        // 2. Determine the target for fetching data (use defaults if not provided)
        const targetForData = initialTarget || sortedTargets[0] || null;
        const monthForData = initialMonth || sortedMonths[0] || null;

        // 3. Prepare base data structures
        const eChartsIndicator = evaluationItemKeys.map(key => ({ name: evaluationItemLabels[key], max: key === 'potential' ? 10 : 5 }));

        // If no data is available at all, return empty structure
        if (!monthForData || !targetForData) {
            return NextResponse.json({ filterOptions, crossTabData: { headers: [], rows: [], averages: {} }, comments: [], monthlySummary: { labels: [], datasets: [], rawData: [] }, eChartsRadarData: { indicator: eChartsIndicator, current: [], cumulative: [] }, currentMonthAverage: "0.0", cumulativeAverage: "0.0", selectedMonth: monthForData, selectedMonthLong: formatMonth(monthForData, 'long') });
        }

        // 4. Fetch all necessary data from DB based on the determined target
        const { rows: potentialEvaluators } = await sql<UserFromDb>`SELECT id, name FROM users WHERE is_active = TRUE AND role IN ('内勤', '営業', '社長') ORDER BY id ASC;`;

        const firstDay = new Date(monthForData + '-01');
        const lastDay = new Date(firstDay.getFullYear(), firstDay.getMonth() + 1, 0);

        const { rows: evaluationsForMonth } = await sql<EvaluationFromDb>`
            SELECT * FROM evaluations 
            WHERE target_employee_name = ${targetForData} 
            AND submitted_at >= ${firstDay.toISOString()} AND submitted_at <= ${lastDay.toISOString()}`;
        
        const { rows: targetEvalsAllMonths } = await sql<EvaluationFromDb & { month: string }>`SELECT *, to_char(submitted_at, 'YYYY-MM') as month FROM evaluations WHERE target_employee_name = ${targetForData};`;

        // 5. Process data for "Cross Tab"
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

        // 6. Process data for "Comments"
        const comments = evaluationsForMonth.map(e => ({ evaluator: e.evaluator_name, comment: e.comment || 'コメントはありません。' })).sort((a, b) => a.evaluator.localeCompare(b.evaluator));

        // 7. Process data for "Monthly Summary" (Table & Graph)
        const monthlyAggregates = targetEvalsAllMonths.reduce((acc, e) => {
            const month = e.month;
            if (!acc[month]) {
                acc[month] = { itemTotals: evaluationItemKeys.reduce((it, key) => ({ ...it, [key]: 0 }), {}), count: 0, totalScoreSum: 0 };
            }
            evaluationItemKeys.forEach(key => { acc[month].itemTotals[key] += e.scores_json[key] || 0; });
            acc[month].count++;
            acc[month].totalScoreSum += e.total_score;
            return acc;
        }, {} as { [month: string]: MonthlyAggregate });

        const lastSixMonths = Object.keys(monthlyAggregates).sort().slice(-6);
        const monthlySummaryRaw = lastSixMonths.map(month => {
            const monthData = monthlyAggregates[month];
            const itemAvgs = evaluationItemKeys.reduce((acc, key) => ({ ...acc, [evaluationItemLabels[key]]: parseFloat((monthData.itemTotals[key] / monthData.count).toFixed(1)) }), {} as { [key: string]: number });
            return { month: formatMonth(month, 'short'), ...itemAvgs, '合計': parseFloat((monthData.totalScoreSum / monthData.count).toFixed(1)) };
        });
        const colors = ['#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF', '#FF9F40', '#C9CBCF', '#8A2BE2', '#D2691E', '#7FFF00'];
        const monthlySummaryChart = {
            labels: lastSixMonths.map(m => formatMonth(m, 'short')),
            datasets: evaluationItemKeys.map((key, index) => ({
                label: evaluationItemLabels[key],
                data: lastSixMonths.map(month => {
                    const avg = (monthlyAggregates[month]?.itemTotals[key] / monthlyAggregates[month]?.count) || 0;
                    return key === 'potential' ? avg / 2 : avg;
                }),
                borderColor: colors[index % colors.length],
                backgroundColor: colors[index % colors.length] + '80',
            }))
        };

        // 8. Process data for Radar Charts
        const currentMonthValues = evaluationItemKeys.map(key => {
            const avg = crossTabAverages[evaluationItemLabels[key]] as number || 0;
            return key === 'potential' ? avg / 2 : avg;
        });
        const cumulativeValues = evaluationItemKeys.map(key => {
            const total = targetEvalsAllMonths.reduce((sum, e) => sum + (e.scores_json[key] || 0), 0);
            const avg = targetEvalsAllMonths.length > 0 ? total / targetEvalsAllMonths.length : 0;
            return key === 'potential' ? avg / 2 : avg;
        });

        const finalResponse = {
            crossTabData: { headers: crossTabHeaders, rows: crossTabRows, averages: crossTabAverages },
            comments,
            monthlySummary: { labels: monthlySummaryChart.labels, datasets: monthlySummaryChart.datasets, rawData: monthlySummaryRaw },
            eChartsRadarData: {
                indicator: eChartsIndicator,
                current: numEvaluators > 0 ? [{ value: currentMonthValues, name: '当月平均点' }] : [],
                cumulative: targetEvalsAllMonths.length > 0 ? [{ value: cumulativeValues.map(v => parseFloat(v.toFixed(1))), name: '累計平均点' }] : []
            },
            currentMonthAverage: numEvaluators > 0 ? (grandTotal / numEvaluators / MAX_TOTAL_SCORE * 100).toFixed(1) : "0.0",
            cumulativeAverage: targetEvalsAllMonths.length > 0 ? (targetEvalsAllMonths.reduce((sum, e) => sum + e.total_score, 0) / targetEvalsAllMonths.length / MAX_TOTAL_SCORE * 100).toFixed(1) : "0.0",
            filterOptions,
            selectedMonth: monthForData,
            selectedMonthLong: formatMonth(monthForData, 'long')
        };

        console.log('--- FINAL API RESPONSE ---', JSON.stringify(finalResponse, null, 2));

        // 9. Final JSON Response
        return NextResponse.json(finalResponse);

    } catch (error) {
        console.error('Analytics API Error:', error);
        return NextResponse.json({ message: 'Error fetching analytics data', error: (error as Error).message }, { status: 500 });
    }
}
