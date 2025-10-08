import { NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';

const MAX_TOTAL_SCORE = 55;
const evaluationItemKeys = ['accuracy', 'discipline', 'cooperation', 'proactiveness', 'agility', 'judgment', 'expression', 'comprehension', 'interpersonal', 'potential'];
const evaluationItemLabels: { [key: string]: string } = { accuracy: '正確性', discipline: '規律性', cooperation: '協調性', proactiveness: '積極性', agility: '俊敏性', judgment: '判断力', expression: '表現力', comprehension: '理解力', interpersonal: '対人性', potential: '将来性' };

interface UserFromDb { id: number; name: string; role: string; }
interface EvaluationFromDb { id: number; evaluator_name: string; target_employee_name: string; scores_json: { [key: string]: number }; total_score: number; comment: string | null; submitted_at: string; }

const formatMonth = (ym: string, format: 'long' | 'short') => {
    if (!ym) return '';
    const [year, month] = ym.split('-');
    if (format === 'long') return `${year}年${parseInt(month, 10)}月度`;
    return `${parseInt(month, 10)}月`;
};

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const selectedMonth = searchParams.get('month');
    const selectedTarget = searchParams.get('target');

    try {
        const allEvalsResult = await sql<{ submitted_at: string; target_employee_name: string; }>`SELECT DISTINCT to_char(submitted_at, 'YYYY-MM') as submitted_at, target_employee_name FROM evaluations;`;
        const sortedMonths = [...new Set(allEvalsResult.rows.map(e => e.submitted_at))].sort((a, b) => b.localeCompare(a));
        const filterOptions = { months: sortedMonths, targets: [...new Set(allEvalsResult.rows.map(e => e.target_employee_name))].sort() };

        const targetMonth = selectedMonth || (filterOptions.months.length > 0 ? filterOptions.months[0] : null);
        const targetEmployee = selectedTarget || (filterOptions.targets.length > 0 ? filterOptions.targets[0] : null);

        const eChartsIndicator = Object.entries(evaluationItemLabels).map(([key, name]) => ({ name, max: key === 'potential' ? 10 : 5 }));

        if (!targetMonth || !targetEmployee) {
            return NextResponse.json({ 
                crossTabData: { headers: [], rows: [], averages: {} }, comments: [],
                monthlySummary: { labels: [], datasets: [], rawData: [] },
                eChartsRadarData: { indicator: eChartsIndicator, current: [], cumulative: [] },
                currentMonthAverage: "0.0", cumulativeAverage: "0.0", 
                filterOptions, selectedMonth: targetMonth, selectedMonthLong: targetMonth ? formatMonth(targetMonth, 'long') : ''
            });
        }

        const { rows: potentialEvaluators } = await sql<UserFromDb>`SELECT id, name, role FROM users WHERE is_active = TRUE AND role IN ('admin', 'manager', 'staff');`;
        const { rows: evaluations } = await sql<EvaluationFromDb>`SELECT *, to_char(submitted_at, 'YYYY-MM') as month FROM evaluations WHERE target_employee_name = ${targetEmployee} AND to_char(submitted_at, 'YYYY-MM') = ${targetMonth};`;

        const crossTabHeaders = ['採点者', ...Object.values(evaluationItemLabels), '合計点'];
        const crossTabRows = potentialEvaluators.map(user => {
            const evaluation = evaluations.find(e => e.evaluator_name === user.name);
            const row: { [key: string]: string | number } = { '採点者': user.name };
            if (evaluation) {
                for (const key of evaluationItemKeys) { row[evaluationItemLabels[key]] = evaluation.scores_json[key] || 0; }
                row['合計点'] = evaluation.total_score;
            } else {
                for (const key of evaluationItemKeys) { row[evaluationItemLabels[key]] = '-'; }
                row['合計点'] = '-';
            }
            return row;
        });

        const submittedRows = crossTabRows.filter(r => r['合計点'] !== '-');
        const itemTotals: { [key: string]: number } = {};
        Object.values(evaluationItemLabels).forEach(label => itemTotals[label] = 0);
        let grandTotal = 0;

        submittedRows.forEach(row => {
            Object.values(evaluationItemLabels).forEach(label => { itemTotals[label] += Number(row[label]); });
            grandTotal += Number(row['合計点']);
        });

        const numEvaluators = submittedRows.length;
        const crossTabAverages: { [key: string]: number | string } = { '採点者': '平均点' };
        if (numEvaluators > 0) {
            Object.values(evaluationItemLabels).forEach(label => { crossTabAverages[label] = parseFloat((itemTotals[label] / numEvaluators).toFixed(1)); });
            crossTabAverages['合計点'] = parseFloat((grandTotal / numEvaluators).toFixed(1));
        }
        
        const crossTabData = { headers: crossTabHeaders, rows: crossTabRows, averages: crossTabAverages };
        const comments = evaluations.map(e => ({ evaluator: e.evaluator_name, comment: e.comment || 'コメントはありません。' })).sort((a, b) => a.evaluator.localeCompare(b.evaluator));

        const targetEvalsAllMonths = (await sql<EvaluationFromDb & { month: string }>`SELECT *, to_char(submitted_at, 'YYYY-MM') as month FROM evaluations WHERE target_employee_name = ${targetEmployee};`).rows;

        const monthlyAggregates: { [month: string]: { itemTotals: {[key:string]: number}, count: number, totalScoreSum: number } } = {};
        targetEvalsAllMonths.forEach(e => {
            if (!monthlyAggregates[e.month]) { monthlyAggregates[e.month] = { itemTotals: evaluationItemKeys.reduce((acc, key) => ({...acc, [key]: 0}), {}), count: 0, totalScoreSum: 0 }; }
            for(const key of evaluationItemKeys) { monthlyAggregates[e.month].itemTotals[key] += e.scores_json[key] || 0; }
            monthlyAggregates[e.month].count++;
            monthlyAggregates[e.month].totalScoreSum += e.total_score;
        });
        
        const lastSixMonths = Object.keys(monthlyAggregates).sort().slice(-6);
        const monthlySummaryRaw = lastSixMonths.map(month => {
            const monthData = monthlyAggregates[month];
            const itemAvgs = evaluationItemKeys.reduce((acc, key) => {
                acc[evaluationItemLabels[key]] = parseFloat((monthData.itemTotals[key] / monthData.count).toFixed(1));
                return acc;
            }, {} as {[key: string]: number});
            return { month: formatMonth(month, 'short'), totalScore: parseFloat((monthData.totalScoreSum / monthData.count).toFixed(1)), ...itemAvgs };
        });

        const colors = ['#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF', '#FF9F40', '#C9CBCF', '#8A2BE2', '#D2691E', '#7FFF00'];
        const monthlySummaryChart = {
            labels: lastSixMonths.map(m => formatMonth(m, 'short')),
            datasets: evaluationItemKeys.map((key, index) => ({
                label: evaluationItemLabels[key],
                data: lastSixMonths.map(month => (monthlyAggregates[month].itemTotals[key] / monthlyAggregates[month].count) || 0),
                borderColor: colors[index % colors.length],
                backgroundColor: colors[index % colors.length] + '80',
            }))
        };
        
        const currentMonthValues = Object.values(evaluationItemLabels).map(label => crossTabAverages[label] as number || 0);
        const eChartsDataCurrent = numEvaluators > 0 ? [{ value: currentMonthValues, name: '当月平均点' }] : [];

        const cumulativeItemTotals: {[key: string]: number} = evaluationItemKeys.reduce((acc, key) => ({...acc, [evaluationItemLabels[key]]: 0}), {});
        let cumulativeTotalScore = 0;
        targetEvalsAllMonths.forEach(e => {
            for(const key of evaluationItemKeys) { cumulativeItemTotals[evaluationItemLabels[key]] += e.scores_json[key] || 0; }
            cumulativeTotalScore += e.total_score;
        });
        const cumulativeValues = Object.values(evaluationItemLabels).map(label => {
            const avg = targetEvalsAllMonths.length > 0 ? cumulativeItemTotals[label] / targetEvalsAllMonths.length : 0;
            return parseFloat(avg.toFixed(1)) || 0;
        });
        const eChartsDataCumulative = targetEvalsAllMonths.length > 0 ? [{ value: cumulativeValues, name: '累計平均点' }] : [];

        const currentMonthAverage = numEvaluators > 0 ? (grandTotal / numEvaluators) : 0;
        const cumulativeAverage = targetEvalsAllMonths.length > 0 ? (cumulativeTotalScore / targetEvalsAllMonths.length) : 0;

        return NextResponse.json({
            crossTabData, comments,
            monthlySummary: { labels: monthlySummaryChart.labels, datasets: monthlySummaryChart.datasets, rawData: monthlySummaryRaw },
            eChartsRadarData: { indicator: eChartsIndicator, current: eChartsDataCurrent, cumulative: eChartsDataCumulative },
            currentMonthAverage: currentMonthAverage.toFixed(1),
            cumulativeAverage: cumulativeAverage.toFixed(1),
            filterOptions, selectedMonth: targetMonth, selectedMonthLong: targetMonth ? formatMonth(targetMonth, 'long') : ''
        });

    } catch (error) {
        console.error('Analytics API Error:', error);
        const message = error instanceof Error ? error.message : 'An unknown error occurred';
        return NextResponse.json({ message: 'Error fetching analytics data', error: message }, { status: 500 });
    }
}