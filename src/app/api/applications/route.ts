export async function GET() {
  try {
    const { rows } = await sql`SELECT * FROM applications ORDER BY submitted_at DESC;`;
    return NextResponse.json(rows, { status: 200 });
  } catch (error: unknown) {
    console.error('API Error:', error);
    const message = error instanceof Error ? error.message : 'An unknown error occurred';
    return NextResponse.json({ message: 'Error fetching applications', error: message }, { status: 500 });
  }
}

import { NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import nodemailer from 'nodemailer';

export async function POST(request: Request) {
  try {
    const { application_type, applicant_name, title, details, emails } = await request.json();

    if (!application_type || !applicant_name || !title || !details || !emails) {
        return NextResponse.json({ message: 'Missing or invalid required fields' }, { status: 400 });
    }

    // Insert into database
    await sql`
      INSERT INTO applications (application_type, applicant_name, title, details)
      VALUES (${application_type}, ${applicant_name}, ${title}, ${JSON.stringify(details)});
    `;

    // Send email
    const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: process.env.GMAIL_ADDRESS,
            pass: process.env.GMAIL_APP_PASSWORD,
        },
    });

    const subject = `【社内ツール】${title}`;
    const body = `申請種別: ${application_type}\n申請者: ${applicant_name}\n\n` + 
                 Object.entries(details).map(([key, value]) => `${key}: ${value}`).join('\n');

    await transporter.sendMail({
        from: process.env.GMAIL_ADDRESS,
        to: emails,
        subject: subject,
        text: body,
    });

    return NextResponse.json({ message: 'Application submitted and email sent successfully' }, { status: 201 });
  } catch (error: unknown) {
    console.error('API Error:', error);
    const message = error instanceof Error ? error.message : 'An unknown error occurred';
    return NextResponse.json({ message: 'Error submitting application', error: message }, { status: 500 });
  }
}
