import { NextResponse } from 'next/server';
import { openDb } from '@/lib/db';

// A helper to get the max possible score for the 100-point conversion
const MAX_TOTAL_SCORE = 65; // 9 items * 5 points + 1 item * 10 points

// To match the items on the frontend
const evaluationItemKeys = [
    'accuracy', 'discipline', 'cooperation', 'proactiveness', 'agility', 
    'judgment', 'expression', 'comprehension', 'interpersonal', 'potential'
];
const evaluationItemLabels: { [key: string]: string } = {
    accuracy: '正確性', discipline: '規律性', cooperation: '協調性', proactiveness: '積極性', agility: '俊敏性',
    judgment: '判断力', expression: '表現力', comprehension: '理解力', interpersonal: '対人性', potential: '将来性'
};

interface RawEvaluation {
    id: number;
    evaluator_name: string;
    target_employee_name: string;
    evaluation_month: string;
    total_score: number;
    comment: string | null;
    scores_json: string;
    submitted_at: string;
}

interface ParsedEvaluation extends Omit<RawEvaluation, 'scores_json'> {
    scores: { [key: string]: number };
}

interface MonthlyAverages {
    month: string;
    averageTotal100: number;
    itemAverages: { [key: string]: number };
}

export async function GET() {
  try {
    const db = await openDb();
    const evaluations = await db.all<RawEvaluation[]>('SELECT * FROM evaluations ORDER BY submitted_at');
    await db.close();

    if (evaluations.length === 0) {
        return NextResponse.json({ monthlyData: {}, latestMonth: null, chartJsData: { labels: [], datasets: [] } });
    }

    // Group evaluations by month (e.g., "2023-10")
    const monthlyData: { [month: string]: ParsedEvaluation[] } = {};
    evaluations.forEach(e => {
        const month = new Date(e.submitted_at).toISOString().slice(0, 7); // YYYY-MM
        if (!monthlyData[month]) {
            monthlyData[month] = [];
        }
        monthlyData[month].push({
            ...e,
            scores: JSON.parse(e.scores_json)
        });
    });

    const processedData: { [month: string]: MonthlyAverages } = {};
    const sortedMonths = Object.keys(monthlyData).sort();

    // Calculate averages for each month
    for (const month of sortedMonths) {
        const monthEvals = monthlyData[month];
        const entryCount = monthEvals.length;
        
        const totals = {
            totalScore100: 0,
            items: evaluationItemKeys.reduce((acc, key) => ({ ...acc, [key]: 0 }), {})
        };

        monthEvals.forEach(ev => {
            totals.totalScore100 += (ev.total_score / MAX_TOTAL_SCORE) * 100;
            for (const key of evaluationItemKeys) {
                totals.items[key] += ev.scores[key] || 0;
            }
        });

        processedData[month] = {
            month: month,
            averageTotal100: (totals.totalScore100 / entryCount),
            itemAverages: evaluationItemKeys.reduce((acc, key) => ({
                ...acc,
                [key]: (totals.items[key] / entryCount)
            }), {})
        };
    }

    // Prepare data for Chart.js
    const chartJsData = {
        labels: sortedMonths,
        datasets: evaluationItemKeys.map(key => ({
            label: evaluationItemLabels[key],
            data: sortedMonths.map(month => processedData[month].itemAverages[key]),
            // You can add styling here, e.g., borderColor, backgroundColor
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
