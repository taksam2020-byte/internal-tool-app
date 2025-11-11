import { NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import nodemailer from 'nodemailer';

export const revalidate = 0; // Disable cache for this route

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type');
  const status = searchParams.get('status');

  try {
    let query = 'SELECT * FROM applications';
    const whereClauses = [];
    const queryParams = [];
    let paramIndex = 1;

    if (type) {
      const types = type.split(',');
      whereClauses.push(`application_type IN (${types.map(() => `$${paramIndex++}`).join(',')})`);
      queryParams.push(...types);
    }

    if (status) {
      whereClauses.push(`status = $${paramIndex++}`);
      queryParams.push(status);
    }

    if (whereClauses.length > 0) {
      query += ` WHERE ${whereClauses.join(' AND ')}`;
    }
    
    query += ' ORDER BY submitted_at DESC';

    const { rows } = await sql.query(query, queryParams);
    
    return NextResponse.json(rows);
  } catch (error) {
    console.error('API Error:', error);
    const message = error instanceof Error ? error.message : 'An unknown error occurred';
    return NextResponse.json({ message: 'Error fetching applications', error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { application_type, applicant_name, title, details, emails } = await request.json();

    if (!application_type || !applicant_name || !title || !details) {
      return NextResponse.json({ message: 'Missing required fields' }, { status: 400 });
    }

    await sql`
      INSERT INTO applications (application_type, applicant_name, title, details, status, submitted_at)
      VALUES (${application_type}, ${applicant_name}, ${title}, ${JSON.stringify(details)}, '未処理', CURRENT_TIMESTAMP);
    `;

    // Send email notification using Nodemailer if email list is provided
    if (emails && Array.isArray(emails) && emails.length > 0) {
      try {
        const transporter = nodemailer.createTransport({
          host: 'smtp.gmail.com',
          port: 465,
          secure: true, // true for 465, false for other ports
          auth: {
            user: process.env.GMAIL_ADDRESS,
            pass: process.env.GMAIL_APP_PASSWORD,
          },
        });

        await transporter.sendMail({
          from: `"社内ツール" <${process.env.GMAIL_ADDRESS}>`,
          to: emails.join(','),
          subject: `【社内ツール】新規申請のお知らせ: ${title}`,
          html: `<p>新しい申請が提出されました。</p>
                 <p><strong>申請種別:</strong> ${title}</p>
                 <p><strong>申請者:</strong> ${applicant_name}</p>
                 <p>詳細は社内ツールをご確認ください。</p>`,
        });
      } catch (emailError) {
        console.error('Failed to send email:', emailError);
        // Do not block the main response for email failure
      }
    }

    return NextResponse.json({ message: 'Application submitted successfully' }, { status: 201 });
  } catch (error) {
    console.error('API Error:', error);
    const message = error instanceof Error ? error.message : 'An unknown error occurred';
    return NextResponse.json({ message: 'Error submitting application', error: message }, { status: 500 });
  }
}
