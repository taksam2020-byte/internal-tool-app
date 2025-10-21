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
  try {
    const { application_type, applicant_name, title, details, emails } = await request.json();

    const fieldLabelMap: { [key: string]: string } = {
        evaluator: '回答者',
        targetEmployee: '対象者',
        totalScore: '合計点',
        comment: 'コメント',
        scores: 'スコア詳細',
        salonType: 'サロン種別',
        personalAccount: '個人口座',
        customerNameFull: '得意先名（正式）',
        customerNameShort: '得意先名（略称）',
        zipCode: '郵便番号',
        address1: '住所1',
        address2: '住所2',
        phone: '電話番号',
        fax: 'FAX番号',
        representativeName: '代表者氏名',
        contactPerson: '担当者',
        closingDay: '締日',
        email: 'メールアドレス',
        billingTarget: '請求先',
        billingCustomerName: '請求先名称',
        billingCustomerCode: '請求先コード',
        includePersonalAccountInBilling: '別得意先への個人口座請求',
        remarks: '備考',
        applicant: '申請者',
        usageDate: '利用日',
        facility: '対象施設',
        equipment: '設備利用',
        startTime: '開始時間',
        endTime: '終了時間',
        purpose: '利用目的',
    };

    if (!application_type || !applicant_name || !title || !details || !emails) {
        return NextResponse.json({ message: 'Missing or invalid required fields' }, { status: 400 });
    }

    const translatedDetails = Object.entries(details).reduce((acc, [key, value]) => {
        const translatedKey = fieldLabelMap[key] || key;
        let translatedValue = value as string;
        if (translatedKey === '請求先') {
            if (value === 'self') translatedValue = 'この得意先へ請求';
            if (value === 'other') translatedValue = '別の得意先へ請求';
        }
        acc[translatedKey] = translatedValue;
        return acc;
    }, {} as Record<string, string>);

    console.log("Translated Details (Object):", translatedDetails);
    const detailsString = JSON.stringify(translatedDetails);
    console.log("Translated Details (String):", detailsString);

    // Insert into database
    await sql`
      INSERT INTO applications (application_type, applicant_name, title, details)
      VALUES (${application_type}, ${applicant_name}, ${title}, ${detailsString});
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
    let body = `申請種別: ${applicationTypeMap[application_type] || application_type}\n申請者: ${applicant_name}\n\n`;

    if (application_type === 'proposal' && details.proposals && Array.isArray(details.proposals)) {
        body += `提案年度: ${details.proposal_year}\n\n`;
        details.proposals.forEach((p: ProposalItem, i: number) => {
            body += `--- 提案 ${i + 1} ---\n`;
            body += `企画(行事)名: ${p.eventName}\n`;
            body += `時期: ${p.timing}\n`;
            body += `種別: ${p.type}\n`;
            body += `内容: ${p.content}\n\n`;
        });
    } else {
        body += Object.entries(details).map(([key, value]) => `${key}: ${value}`).join('\n');
    }

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