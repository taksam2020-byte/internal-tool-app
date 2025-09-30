import { NextResponse } from 'next/server';
import { openDb } from '@/lib/db';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { targetEmployee, evaluator, scores, evaluationMonth, comment, totalScore } = body;

    const db = await openDb();
    await db.run(
      `INSERT INTO evaluations (evaluator_name, target_employee_name, evaluation_month, total_score, comment, scores_json)
       VALUES (?, ?, ?, ?, ?, ?)`, 
      [evaluator, targetEmployee, evaluationMonth, totalScore, comment, JSON.stringify(scores)]
    );
    await db.close();

    return NextResponse.json({ message: 'Evaluation submitted successfully' }, { status: 200 });
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json({ message: 'Error submitting evaluation' }, { status: 500 });
  }
}
