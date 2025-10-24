import { sql } from '@vercel/postgres';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const subscription = await request.json();
    // TODO: Add validation for the subscription object

    // Avoid storing duplicate subscriptions
    const { rows } = await sql`
      SELECT * FROM subscriptions WHERE subscription->>'endpoint' = ${subscription.endpoint};
    `;

    if (rows.length > 0) {
      return NextResponse.json({ message: 'Subscription already exists.' }, { status: 200 });
    }

    await sql`
      INSERT INTO subscriptions (subscription) VALUES (${JSON.stringify(subscription)});
    `;

    return NextResponse.json({ message: 'Subscription saved.' }, { status: 201 });
  } catch (error) {
    console.error('Error saving subscription:', error);
    return NextResponse.json({ message: 'Failed to save subscription.' }, { status: 500 });
  }
}
