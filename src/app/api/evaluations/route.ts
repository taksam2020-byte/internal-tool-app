import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { targetEmployee, scores, evaluationMonth, comment, totalScore } = body;

    // TODO: Save the evaluation data to a database
    console.log('Received evaluation submission:');
    console.log('Month:', evaluationMonth);
    console.log('Employee:', targetEmployee);
    console.log('Scores:', scores);
    console.log('Total Score:', totalScore);
    console.log('Comment:', comment);

    return NextResponse.json({ message: 'Evaluation submitted successfully' }, { status: 200 });
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json({ message: 'Error submitting evaluation' }, { status: 500 });
  }
}
