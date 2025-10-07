

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
        const allEvalsResult = await sql<{ submitted_at: string; target_employee_name: string; }>`SELECT DISTINCT submitted_at, target_employee_name FROM evaluations;`;
        const sortedMonths = [...new Set(allEvalsResult.rows.map(e => new Date(e.submitted_at).toISOString().slice(0, 7)))].sort((a, b) => b.localeCompare(a));
        const filterOptions = { months: sortedMonths, targets: [...new Set(allEvalsResult.rows.map(e => e.target_employee_name))].sort() };

        const targetMonth = selectedMonth || (filterOptions.months.length > 0 ? filterOptions.months[0] : null);
        const targetEmployee = selectedTarget || (filterOptions.targets.length > 0 ? filterOptions.targets[0] : null);

        const eChartsIndicator = Object.values(evaluationItemLabels).map(label => ({ name: label, max: label === '将来性' ? 10 : 5 }));

        if (!targetMonth || !targetEmployee) {
            return NextResponse.json({ 
                crossTabData: { headers: [], rows: [], averages: {} }, comments: [], chartJsData: { labels: [], datasets: [] }, 
                eChartsRadarData: { indicator: eChartsIndicator, current: [], cumulative: [] },
                currentMonthAverage: "0.0", cumulativeAverage: "0.0", 
                filterOptions, monthlySummary: [], selectedMonth: targetMonth, selectedMonthLong: targetMonth ? formatMonth(targetMonth, 'long') : ''
            });
        }

        const { rows: potentialEvaluators } = await sql<UserFromDb>`SELECT id, name, role FROM users WHERE is_active = TRUE;`;
        const { rows: evaluations } = await sql<EvaluationFromDb>`SELECT * FROM evaluations WHERE target_employee_name = ${targetEmployee} AND to_char(submitted_at, 'YYYY-MM') = ${targetMonth};`;

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
        const comments = evaluations.map(e => ({ evaluator: e.evaluator_name, comment: e.comment || 'コメントはありません。' }));

        const targetEvalsAllMonths = (await sql<EvaluationFromDb & { month: string }>`SELECT scores_json, total_score, to_char(submitted_at, 'YYYY-MM') as month FROM evaluations WHERE target_employee_name = ${targetEmployee};`).rows;

        const monthlyAggregates: { [month: string]: { totalScores: number[], itemTotals: {[key:string]: number}, count: number } } = {};
        targetEvalsAllMonths.forEach(e => {
            const month = e.month as string;
            if (!monthlyAggregates[month]) { monthlyAggregates[month] = { totalScores: [], itemTotals: evaluationItemKeys.reduce((acc, key) => ({...acc, [key]: 0}), {}), count: 0 }; }
            monthlyAggregates[month].totalScores.push(e.total_score);
            for(const key of evaluationItemKeys) { monthlyAggregates[month].itemTotals[key] += e.scores_json[key] || 0; }
            monthlyAggregates[month].count++;
        });
        
        const chronoSortedMonths = Object.keys(monthlyAggregates).sort();
        const chartJsData = { labels: chronoSortedMonths.map(m => formatMonth(m, 'short')), datasets: evaluationItemKeys.map((key, index) => {
            const colors = ['#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF', '#FF9F40', '#C9CBCF', '#8A2BE2', '#D2691E', '#7FFF00'];
            return { label: evaluationItemLabels[key], data: chronoSortedMonths.map(month => {
                const avgScore = (monthlyAggregates[month].itemTotals[key] / monthlyAggregates[month].count);
                return key === 'potential' ? avgScore / 2 : avgScore;
            }), borderColor: colors[index % colors.length], backgroundColor: colors[index % colors.length] + '80' };
        }) };
        
        const currentMonthValues = Object.values(evaluationItemLabels).map(label => crossTabAverages[label] as number || 0);
        const eChartsDataCurrent = numEvaluators > 0 ? [{ value: currentMonthValues, name: '当月平均点' }] : [];

        const cumulativeItemTotals: {[key: string]: number} = evaluationItemKeys.reduce((acc, key) => ({...acc, [evaluationItemLabels[key]]: 0}), {});
        targetEvalsAllMonths.forEach(e => {
            for(const key of evaluationItemKeys) { cumulativeItemTotals[evaluationItemLabels[key]] += e.scores_json[key] || 0; }
        });
        const cumulativeValues = Object.values(evaluationItemLabels).map(label => {
            const avg = cumulativeItemTotals[label] / targetEvalsAllMonths.length;
            return parseFloat(avg.toFixed(1)) || 0;
        });
        const eChartsDataCumulative = targetEvalsAllMonths.length > 0 ? [{ value: cumulativeValues, name: '累計平均点' }] : [];

        const currentMonthTotalScore = evaluations.reduce((sum, e) => sum + e.total_score, 0);
        const currentMonthAverage = numEvaluators > 0 ? ((currentMonthTotalScore / numEvaluators) / MAX_TOTAL_SCORE) * 100 : 0;
        const cumulativeTotal = targetEvalsAllMonths.reduce((sum, e) => sum + e.total_score, 0);
        const cumulativeAverage = targetEvalsAllMonths.length > 0 ? ((cumulativeTotal / targetEvalsAllMonths.length) / MAX_TOTAL_SCORE) * 100 : 0;

        const monthlySummary = chronoSortedMonths.map(month => {
            const monthData = monthlyAggregates[month];
            const totalScoreSum = monthData.totalScores.reduce((a, b) => a + b, 0);
            const itemAvgs = evaluationItemKeys.reduce((acc, key) => {
                acc[evaluationItemLabels[key]] = parseFloat((monthData.itemTotals[key] / monthData.count).toFixed(1));
                return acc;
            }, {} as {[key: string]: number});
            return { month: formatMonth(month, 'short'), totalScore: parseFloat((totalScoreSum / monthData.count).toFixed(1)), itemAverages: itemAvgs };
        });

        return NextResponse.json({
            crossTabData, comments, chartJsData,
            eChartsRadarData: { indicator: eChartsIndicator, current: eChartsDataCurrent, cumulative: eChartsDataCumulative },
            currentMonthAverage: currentMonthAverage.toFixed(1),
            cumulativeAverage: cumulativeAverage.toFixed(1),
            filterOptions, monthlySummary,
            selectedMonth: targetMonth, selectedMonthLong: targetMonth ? formatMonth(targetMonth, 'long') : ''
        });

    } catch (error) {
        console.error('Analytics API Error:', error);
        const message = error instanceof Error ? error.message : 'An unknown error occurred';
        return NextResponse.json({ message: 'Error fetching analytics data', error: message }, { status: 500 });
    }
}