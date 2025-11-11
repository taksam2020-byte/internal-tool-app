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
          secure: true,
          auth: {
            user: process.env.GMAIL_ADDRESS,
            pass: process.env.GMAIL_APP_PASSWORD,
          },
        });

        let emailBody = `<p><strong>申請種別:</strong> ${title}</p><p><strong>申請者:</strong> ${applicant_name}</p><hr>`;

        if (application_type === 'proposal') {
          const proposalYear = details.proposal_year || '';
          emailBody += `<p><strong>提案年度:</strong> ${proposalYear}</p><br>`;
          
          const proposalItems: { [key: string]: string }[] = [];
          const proposalKeys = Object.keys(details).filter(k => k.startsWith('提案'));
          const proposalIndices = Array.from(new Set(proposalKeys.map(k => k.match(/(\d+)/)?.[0]))).filter(Boolean);

          proposalIndices.forEach(index => {
            proposalItems.push({
              '企画名': details[`提案${index}_企画名`],
              '時期': details[`提案${index}_時期`],
              '種別': details[`提案${index}_種別`],
              '内容': details[`提案${index}_内容`],
            });
          });

          proposalItems.forEach((item, i) => {
            emailBody += `<h4>--- 提案 ${i + 1} ---</h4>`;
            emailBody += `<p><strong>企画(行事)名:</strong> ${item['企画名'] || ''}</p>`;
            emailBody += `<p><strong>時期:</strong> ${item['時期'] || ''}</p>`;
            emailBody += `<p><strong>種別:</strong> ${item['種別'] || ''}</p>`;
            emailBody += `<p><strong>内容:</strong></p><p style="white-space: pre-wrap;">${item['内容'] || ''}</p>`;
            emailBody += '<br>';
          });

        } else {
          const detailsToProcess: Record<string, any> = { ...details };

          // Translate values
          if (application_type === 'customer_registration' || application_type === 'customer_change') {
            if (detailsToProcess['請求先'] === 'self') {
              detailsToProcess['請求先'] = 'この得意先へ請求（単独）';
            }
            if (detailsToProcess['請求先'] === 'other') {
              detailsToProcess['請求先'] = '別の得意先へ請求';
            }
            if (detailsToProcess['既存の自動引落に追加'] === 'on') {
              detailsToProcess['既存の自動引落に追加'] = 'はい';
            }
            if (detailsToProcess['個人口座を含めて引き落とす'] === 'on') {
              detailsToProcess['個人口座を含めて引き落とす'] = 'はい';
            }
          }

          // Handle array values
          if (Array.isArray(detailsToProcess['設備利用'])) {
              detailsToProcess['設備利用'] = detailsToProcess['設備利用'].join(', ');
          }

          // Define display order to match the frontend
          const displayOrder = [
            // Common
            '申請者', '担当者', '適用開始日',
            // Customer
            'サロン種別', '個人口座', '得意先名（正式）', '得意先名（略称）', '郵便番号', '住所1', '住所2', '電話番号', 'FAX番号', '代表者氏名', '締日', 'メールアドレス', '請求先', '請求先名称', '請求先コード', '別得意先への個人口座請求', '既存の自動引落に追加', '個人口座を含めて引き落とす',
            // Change Customer
            '変更元得意先コード', '変更元得意先名', '新しい得意先名（正式）', '新しい得意先名（略称）',
            // Reservation
            '利用日', '対象施設', '設備利用', '開始時間', '終了時間', '利用目的',
            // Common
            '備考',
          ];

          const sortedDetails = Object.entries(detailsToProcess)
            .sort(([keyA], [keyB]) => {
                const indexA = displayOrder.indexOf(keyA);
                const indexB = displayOrder.indexOf(keyB);
                if (indexA === -1) return 1;
                if (indexB === -1) return -1;
                return indexA - indexB;
            });

          emailBody += sortedDetails
            .map(([key, value]) => `<p><strong>${key}:</strong> ${value || ''}</p>`)
            .join('');
        }

        await transporter.sendMail({
          from: `"社内ツール" <${process.env.GMAIL_ADDRESS}>`,
          to: emails.join(','),
          subject: `【社内ツール】新規申請のお知らせ: ${title}`,
          html: emailBody,
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
