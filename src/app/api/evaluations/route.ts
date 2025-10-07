import { NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { targetEmployee, evaluator, scores, evaluationMonth, comment, totalScore } = body;

    // Check for duplicate submission
    const { rows: existing } = await sql`
      SELECT id FROM evaluations 
      WHERE evaluator_name = ${evaluator} 
      AND target_employee_name = ${targetEmployee} 
      AND evaluation_month = ${evaluationMonth};
    `;

    if (existing.length > 0) {
        return NextResponse.json({ error: 'この対象者に対する今月の考課は既に提出済みです。' }, { status: 409 });
    }

    await sql`
      INSERT INTO evaluations 
        (evaluator_name, target_employee_name, evaluation_month, total_score, comment, scores_json)
      VALUES 
        (${evaluator}, ${targetEmployee}, ${evaluationMonth}, ${totalScore}, ${comment}, ${JSON.stringify(scores)}::jsonb);
    `;

    return NextResponse.json({ message: 'Evaluation submitted successfully' }, { status: 200 });
  } catch (error: unknown) {
    console.error('API Error:', error);
    const message = error instanceof Error ? error.message : 'An unknown error occurred';
    return NextResponse.json({ message: 'Error submitting evaluation', error: message }, { status: 500 });
  }
}