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
  } catch (error: any) {
    console.error('API Error:', error);
    return NextResponse.json({ message: 'Error submitting evaluation', error: error.message }, { status: 500 });
  }
}