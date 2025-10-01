import { NextResponse } from 'next/server';
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
    scores_json: { [key: string]: number };
    total_score: number;
    submitted_at: string;
}

interface MonthlyAverages {
    month: string;
    averageTotal100: number;
    itemAverages: { [key: string]: number };
}

export async function GET() {
  try {
    const { rows: evaluations } = await sql<EvaluationFromDb>`SELECT id, scores_json, total_score, submitted_at FROM evaluations ORDER BY submitted_at;`;

    if (evaluations.length === 0) {
        return NextResponse.json({ monthlyData: {}, latestMonth: null, chartJsData: { labels: [], datasets: [] } });
    }

    const monthlyData: { [month: string]: { scores: { [key: string]: number }[], total_scores: number[] } } = {};
    evaluations.forEach(e => {
        const month = new Date(e.submitted_at).toISOString().slice(0, 7); // YYYY-MM
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
            itemAverages: evaluationItemKeys.reduce((acc, key) => ({
                ...acc,
                [key]: (itemTotals[key] / entryCount)
            }), {}),
            rawItemAverages: evaluationItemKeys.reduce((acc, key) => ({
                ...acc,
                [key]: (rawItemTotals[key] / entryCount)
            }), {})
        };
    }

    const chartJsData = {
        labels: sortedMonths,
        datasets: evaluationItemKeys.map(key => ({
            label: evaluationItemLabels[key],
            data: sortedMonths.map(month => processedData[month].itemAverages[key]),
        }))
    };

    const latestMonthKey = sortedMonths[sortedMonths.length - 1];
    const latestMonthData = processedData[latestMonthKey];

    return NextResponse.json({ 
        monthlyData: processedData, 
        latestMonth: latestMonthData,
        chartJsData 
    });

  } catch (error) {
    console.error('Analytics API Error:', error);
    return NextResponse.json({ message: 'Error fetching analytics data' }, { status: 500 });
  }
}