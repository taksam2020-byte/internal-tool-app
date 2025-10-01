import { NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { targetEmployee, evaluator, scores, evaluationMonth, comment, totalScore } = body;

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