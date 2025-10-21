'use client';

import { NextResponse, NextRequest } from 'next/server';
import { sql } from '@vercel/postgres';
import nodemailer from 'nodemailer';

const applicationTypeMap: { [key: string]: string } = {
  customer_registration: '得意先新規登録',
  customer_change: '得意先情報変更',
  facility_reservation: '施設予約',
  proposal: '催事提案',
  evaluation: '新人考課',
};

interface ProposalItem {
  eventName: string;
  timing: string;
  type: string;
  content: string;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const types = searchParams.getAll('type');
    const year = searchParams.get('year');
    const status = searchParams.get('status');

    let query = 'SELECT * FROM applications';
    const values = [];
    const conditions = [];

    if (types.length > 0) {
      conditions.push(`application_type IN (${types.map((_, i) => `$${values.length + i + 1}`).join(',')})`);
      values.push(...types);
    }

    if (year) {
      conditions.push(`details->>'proposal_year' = $${values.length + 1}`);
      values.push(year);
    }

    if (status) {
        conditions.push(`status = $${values.length + 1}`);
        values.push(status);
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    query += ' ORDER BY submitted_at DESC;';

    const { rows } = await sql.query(query, values);
    return NextResponse.json(rows, { status: 200 });
  } catch (error: unknown) {
    console.error('API Error:', error);
    const message = error instanceof Error ? error.message : 'An unknown error occurred';
    return NextResponse.json({ message: 'Error fetching applications', error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  console.log('Received POST request to /api/applications');
  try {
    const body = await request.json();
    console.log('Request body:', body);

    const { application_type, applicant_name, title, details, emails } = body;

    if (!application_type || !applicant_name || !title || !details || !emails) {
        console.error('Validation failed: Missing required fields');
        return NextResponse.json({ message: 'Missing or invalid required fields' }, { status: 400 });
    }

    const fieldLabelMap: { [key: string]: string } = {
        proposal_year: '提案年度',
        evaluator: '回答者',
        targetEmployee: '対象者',
        totalScore: '合計点',
        comment: 'コメント',
        scores: 'スコア詳細',
        // Add all other field translations here
    };

    console.log('Original details:', details);
    const translatedDetails = Object.entries(details).reduce((acc, [key, value]) => {
        const translatedKey = fieldLabelMap[key] || key;
        acc[translatedKey] = value as string;
        return acc;
    }, {} as Record<string, string>);
    console.log('Translated details before stringify:', translatedDetails);

    // Insert into database
    await sql`
      INSERT INTO applications (application_type, applicant_name, title, details)
      VALUES (${application_type}, ${applicant_name}, ${title}, ${JSON.stringify(translatedDetails)});
    `;
    console.log('Successfully inserted into database');

    // Send email
    const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: process.env.GMAIL_ADDRESS,
            pass: process.env.GMAIL_APP_PASSWORD,
        },
    });

    const subject = `【社内ツール】${title}`;
    const bodyText = `申請種別: ${applicationTypeMap[application_type] || application_type}\n申請者: ${applicant_name}\n\n` +
                 Object.entries(translatedDetails).map(([key, value]) => `${key}: ${value}`).join('\n');

    await transporter.sendMail({
        from: process.env.GMAIL_ADDRESS,
        to: emails,
        subject: subject,
        text: bodyText,
    });
    console.log('Successfully sent email');

    return NextResponse.json({ message: 'Application submitted and email sent successfully' }, { status: 201 });
  } catch (error: unknown) {
    console.error('API Error in POST /api/applications:', error);
    const message = error instanceof Error ? error.message : 'An unknown error occurred';
    return NextResponse.json({ message: 'Error submitting application', error: message }, { status: 500 });
  }
}