import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';

const MAX_TOTAL_SCORE = 50; // 9 items * 5 points + 1 item * 5 points (scaled)

const evaluationItemKeys = [
    'accuracy', 'discipline', 'cooperation', 'proactiveness', 'agility', 
    'judgment', 'expression', 'comprehension', 'interpersonal', 'potential'
];
const evaluationItemLabels: { [key: string]: string } = {
    accuracy: '正確性', discipline: '規律性', cooperation: '協調性', proactiveness: '積極性', agility: '俊敏性',
    judgment: '判断力', expression: '表現力', comprehension: '理解力', interpersonal: '対人性', potential: '将来性'
};

interface EvaluationFromDb {
    id: number;
    evaluator_name: string;
    target_employee_name: string;
    scores_json: { [key: string]: number };
    total_score: number;
    submitted_at: string;
}

interface MonthlyAverages {
    month: string;
    averageTotal100: number;
    itemAverages: { [key: string]: number };
    rawItemAverages: { [key: string]: number };
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const month = searchParams.get('month'); // e.g., '2023-10'
    const target = searchParams.get('target');

    const { rows: evaluations } = await sql.query(query, params);

    if (evaluations.length === 0) {
        return NextResponse.json({ 
            monthlyData: {}, 
            latestMonth: null, 
            chartJsData: { labels: [], datasets: [] },
            crossTabData: { headers: [], rows: [] },
            filterOptions: { months: [], targets: [] }
        });
    }

    // --- Start of existing aggregation logic ---
    const allDbEvals = await sql<EvaluationFromDb>`SELECT submitted_at, target_employee_name FROM evaluations`;
    const filterOptions = {
        months: [...new Set(allDbEvals.rows.map(e => new Date(e.submitted_at).toISOString().slice(0, 7)))].sort().reverse(),
        targets: [...new Set(allDbEvals.rows.map(e => e.target_employee_name))].sort()
    };

    const monthlyData: { [month: string]: { scores: { [key: string]: number }[], total_scores: number[] } } = {};
    evaluations.forEach(e => {
        const month = new Date(e.submitted_at).toISOString().slice(0, 7);
        if (!monthlyData[month]) {
            monthlyData[month] = { scores: [], total_scores: [] };
        }
        monthlyData[month].scores.push(e.scores_json);
        monthlyData[month].total_scores.push(e.total_score);
    });

    const processedData: { [month: string]: MonthlyAverages } = {};
    const sortedMonths = Object.keys(monthlyData).sort();

    for (const month of sortedMonths) {
        const monthEvals = monthlyData[month];
        const entryCount = monthEvals.scores.length;
        
        const itemTotals = evaluationItemKeys.reduce((acc, key) => ({ ...acc, [key]: 0 }), {} as { [key: string]: number });
        const rawItemTotals = evaluationItemKeys.reduce((acc, key) => ({ ...acc, [key]: 0 }), {} as { [key: string]: number });
        let totalScoreSum = 0;

        monthEvals.scores.forEach(scoreSet => {
            for (const key of evaluationItemKeys) {
                const rawScore = scoreSet[key] || 0;
                rawItemTotals[key] += rawScore;
                if (key === 'potential') {
                    itemTotals[key] += rawScore / 2;
                } else {
                    itemTotals[key] += rawScore;
                }
            }
        });
        monthEvals.total_scores.forEach(s => totalScoreSum += s);

        processedData[month] = {
            month: month,
            averageTotal100: ((totalScoreSum / entryCount) / MAX_TOTAL_SCORE) * 100,
            itemAverages: evaluationItemKeys.reduce((acc, key) => ({ ...acc, [key]: (itemTotals[key] / entryCount) }), {} as { [key: string]: number }),
            rawItemAverages: evaluationItemKeys.reduce((acc, key) => ({ ...acc, [key]: (rawItemTotals[key] / entryCount) }), {} as { [key: string]: number })
        };
    }

    const chartJsData = {
        labels: sortedMonths,
        datasets: evaluationItemKeys.map(key => ({
            label: evaluationItemLabels[key],
            data: sortedMonths.map(month => processedData[month]?.itemAverages[key] || 0),
        }))
    };

    const latestMonthKey = sortedMonths[sortedMonths.length - 1];
    const latestMonthData = processedData[latestMonthKey];

    let cumulativeAverage = 0;
    if (evaluations.length > 0) {
        let cumulativeTotalScore = 0;
        evaluations.forEach(e => cumulativeTotalScore += e.total_score);
        cumulativeAverage = ((cumulativeTotalScore / evaluations.length) / MAX_TOTAL_SCORE) * 100;
    }
    // --- End of aggregation logic ---

    // --- Crosstab Logic ---
    const evaluators = [...new Set(evaluations.map(e => e.evaluator_name))].sort();
    const crossTabRows = evaluationItemKeys.map(itemKey => {
        const row: { [key: string]: string | number } = { item: evaluationItemLabels[itemKey] };
        evaluators.forEach(evaluator => {
            const specificEval = evaluations.find(e => e.evaluator_name === evaluator);
            row[evaluator] = specificEval ? specificEval.scores_json[itemKey] : '-';
        });
        return row;
    });

    const crossTabData = {
        headers: ['評価項目', ...evaluators],
        rows: crossTabRows
    };

    return NextResponse.json({ 
        monthlyData: processedData, 
        latestMonth: latestMonthData,
        chartJsData,
        cumulativeAverage: cumulativeAverage.toFixed(1),
        crossTabData,
        filterOptions
    });

  } catch (error) {
    console.error('Analytics API Error:', error);
    const message = error instanceof Error ? error.message : 'An unknown error occurred';
    return NextResponse.json({ message: 'Error fetching analytics data', error: message }, { status: 500 });
  }
}