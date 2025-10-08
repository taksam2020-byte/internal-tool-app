import { NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';

const evaluationItemKeys = ['accuracy', 'discipline', 'cooperation', 'proactiveness', 'agility', 'judgment', 'expression', 'comprehension', 'interpersonal', 'potential'];
const evaluationItemLabels: { [key: string]: string } = { accuracy: '正確性', discipline: '規律性', cooperation: '協調性', proactiveness: '積極性', agility: '俊敏性', judgment: '判断力', expression: '表現力', comprehension: '理解力', interpersonal: '対人性', potential: '将来性' };

interface UserFromDb { name: string; }
interface EvaluationFromDb { evaluator_name: string; target_employee_name: string; scores_json: { [key: string]: number }; total_score: number; comment: string | null; submitted_at: string; }

const formatMonth = (ym: string, format: 'long' | 'short') => {
    if (!ym) return '';
    const [year, month] = ym.split('-');
    if (format === 'long') return `${year}年${parseInt(month, 10)}月度`;
    return `${parseInt(month, 10)}月`;
};

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        let selectedMonth = searchParams.get('month');
        let selectedTarget = searchParams.get('target');

        console.log(`Initial params: month=${searchParams.get('month')}, target=${searchParams.get('target')}`);

        const allEvalsResult = await sql<{ submitted_at: string; target_employee_name: string; }>`SELECT DISTINCT to_char(submitted_at, 'YYYY-MM') as submitted_at, target_employee_name FROM evaluations;`;
        const sortedMonths = [...new Set(allEvalsResult.rows.map(e => e.submitted_at))].sort((a, b) => b.localeCompare(a));
        const sortedTargets = [...new Set(allEvalsResult.rows.map(e => e.target_employee_name))].sort();
        const filterOptions = { months: sortedMonths, targets: sortedTargets };

        if (!selectedTarget) {
            selectedTarget = sortedTargets[0] || null;
        }
        if (!selectedMonth) {
            selectedMonth = sortedMonths[0] || null;
        }

        console.log(`Resolved params: month=${selectedMonth}, target=${selectedTarget}`);

        const eChartsIndicator = evaluationItemKeys.map(key => ({ name: evaluationItemLabels[key], max: key === 'potential' ? 10 : 5 }));

        if (!selectedMonth || !selectedTarget) {
            console.log('Exiting early: month or target is null');
            return NextResponse.json({ filterOptions, crossTabData: { headers: [], rows: [], averages: {} }, comments: [], monthlySummary: { labels: [], datasets: [], rawData: [] }, eChartsRadarData: { indicator: eChartsIndicator, current: [], cumulative: [] }, currentMonthAverage: "0.0", cumulativeAverage: "0.0", selectedMonth, selectedMonthLong: selectedMonth ? formatMonth(selectedMonth, 'long') : '' });
        }

        const { rows: potentialEvaluators } = await sql<UserFromDb>`SELECT name FROM users WHERE is_active = TRUE AND role IN ('admin', 'manager', 'staff');`;
        const { rows: evaluationsForMonth } = await sql<EvaluationFromDb>`SELECT * FROM evaluations WHERE target_employee_name = ${selectedTarget} AND to_char(submitted_at, 'YYYY-MM') = ${selectedMonth};`;

        console.log(`DB query results: potentialEvaluators=${potentialEvaluators.length}, evaluationsForMonth=${evaluationsForMonth.length}`);

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
        const itemTotals = evaluationItemKeys.reduce((acc, key) => ({ ...acc, [evaluationItemLabels[key]]: 0 }), {} as { [key: string]: number });
        let grandTotal = 0;

        submittedRows.forEach(row => {
            evaluationItemKeys.forEach(key => { itemTotals[evaluationItemLabels[key]] += Number(row[evaluationItemLabels[key]]); });
            grandTotal += Number(row['合計点']);
        });

        const numEvaluators = submittedRows.length;
        const crossTabAverages = { '採点者': '平均点' } as { [key: string]: string | number };
        if (numEvaluators > 0) {
            evaluationItemKeys.forEach(key => { crossTabAverages[evaluationItemLabels[key]] = parseFloat((itemTotals[evaluationItemLabels[key]] / numEvaluators).toFixed(1)); });
            crossTabAverages['合計点'] = parseFloat((grandTotal / numEvaluators).toFixed(1));
        }
        
        const crossTabData = { headers: crossTabHeaders, rows: crossTabRows, averages: crossTabAverages };
        const comments = evaluationsForMonth.map(e => ({ evaluator: e.evaluator_name, comment: e.comment || 'コメントはありません。' })).sort((a, b) => a.evaluator.localeCompare(b.evaluator));

        const { rows: targetEvalsAllMonths } = await sql<EvaluationFromDb & { month: string }>`SELECT *, to_char(submitted_at, 'YYYY-MM') as month FROM evaluations WHERE target_employee_name = ${selectedTarget};`;

        const monthlyAggregates: { [month: string]: { itemTotals: {[key:string]: number}, count: number, totalScoreSum: number } } = {};
        targetEvalsAllMonths.forEach(e => {
            if (!monthlyAggregates[e.month]) { monthlyAggregates[e.month] = { itemTotals: evaluationItemKeys.reduce((acc, key) => ({...acc, [key]: 0}), {}), count: 0, totalScoreSum: 0 }; }
            evaluationItemKeys.forEach(key => { monthlyAggregates[e.month].itemTotals[key] += e.scores_json[key] || 0; });
            monthlyAggregates[e.month].count++;
            monthlyAggregates[e.month].totalScoreSum += e.total_score;
        });
        
        const lastSixMonths = Object.keys(monthlyAggregates).sort().slice(-6);
        const monthlySummaryRaw = lastSixMonths.map(month => {
            const monthData = monthlyAggregates[month];
            const itemAvgs = evaluationItemKeys.reduce((acc, key) => ({ ...acc, [evaluationItemLabels[key]]: parseFloat((monthData.itemTotals[key] / monthData.count).toFixed(1)) }), {} as {[key: string]: number});
            const total = parseFloat((monthData.totalScoreSum / monthData.count).toFixed(1));
            return { month: formatMonth(month, 'short'), ...itemAvgs, '合計': total };
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
        
        const currentMonthValues = evaluationItemKeys.map(key => {
            const avg = crossTabAverages[evaluationItemLabels[key]] as number || 0;
            return key === 'potential' ? avg / 2 : avg;
        });
        const eChartsDataCurrent = numEvaluators > 0 ? [{ value: currentMonthValues, name: '当月平均点' }] : [];

        const cumulativeItemTotals = evaluationItemKeys.reduce((acc, key) => ({ ...acc, [evaluationItemLabels[key]]: 0 }), {} as { [key: string]: number });
        let cumulativeTotalScore = 0;
        targetEvalsAllMonths.forEach(e => {
            evaluationItemKeys.forEach(key => { cumulativeItemTotals[evaluationItemLabels[key]] += e.scores_json[key] || 0; });
            cumulativeTotalScore += e.total_score;
        });
        const cumulativeValues = evaluationItemKeys.map(key => {
            let avg = targetEvalsAllMonths.length > 0 ? cumulativeItemTotals[evaluationItemLabels[key]] / targetEvalsAllMonths.length : 0;
            avg = parseFloat(avg.toFixed(1));
            return key === 'potential' ? avg / 2 : avg;
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
            filterOptions, selectedMonth, selectedMonthLong: selectedMonth ? formatMonth(selectedMonth, 'long') : ''
        });

    } catch (error) {
        console.error('Analytics API Error:', error);
        const message = error instanceof Error ? error.message : 'An unknown error occurred';
        return NextResponse.json({ message: 'Error fetching analytics data', error: message }, { status: 500 });
    }
}
