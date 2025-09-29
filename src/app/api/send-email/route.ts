import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

export async function POST(request: Request) {
  try {
    const { to, subject, body } = await request.json();

    // 環境変数から認証情報を取得
    const user = process.env.GMAIL_ADDRESS;
    const pass = process.env.GMAIL_APP_PASSWORD;

    if (!user || !pass) {
        console.error('Gmail credentials are not set in environment variables.');
        return NextResponse.json({ success: false, message: 'サーバー設定が不完全です。' }, { status: 500 });
    }

    const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: user,
            pass: pass,
        },
    });

    const mailOptions = {
        from: user,
        to: to, // 配列でも可
        subject: subject,
        text: body,
    };

    await transporter.sendMail(mailOptions);

    return NextResponse.json({ success: true, message: 'メールが正常に送信されました。' });

  } catch (error) {
    console.error('Mail sending error:', error);
    return NextResponse.json({ success: false, message: 'メールの送信に失敗しました。' }, { status: 500 });
  }
}