import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import nodemailer from 'nodemailer';

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

// مصفوفة الإيميلات باستخدام الـ Refresh Token
const emailAccounts = [
  { user: 'abdallahsabryali@gmail.com', refreshToken: process.env.1//04ji7sJJUfadaCgYIARAAGAQSNwF-L9Ir1HjP9QwZN1MsLJS2f23y1t4KERwd1Iy_qxpE9NPhDjhnHNtgX2wZVsYfrHRTuVRsxR8 },
  { user: 'ali6newac@gmail.com', refreshToken: process.env.1//04_yByspyLgIXCgYIARAAGAQSNwF-L9IrDJ8TIzogOWUvNbTKy60x83GRZg1jNw0c06NeLBD0o7AV9y9Ibk8IrCsZsoNRniUqyZ0 },
  { user: 'ali08acc@gmail.com', refreshToken: process.env.1//04WdtNaEJxRBjCgYIARAAGAQSNwF-L9Irwxd54Q6vQi_sDyvjBjxx40VqP8TDD55inVzj10v-EGmAE7JUkh_T4zN8EdsNnvBWfTA },
  { user: 'ali09acc@gmail.com', refreshToken: process.env.1//04URvlvnCG_OVCgYIARAAGAQSNwF-L9IrQeiP_us9jrajgpzxnKZ0-DdPvcB40JSoINwQAwqVML3HCXsLmTJo6qEZZY0MGMhP1RA },
  { user: 'alisabry31024@gmail.com', refreshToken: process.env.1//04PuaouVq8g8oCgYIARAAGAQSNwF-L9Ir1k9_DPFLAvxXuPxPlZ_PLwGjqKE9krrpz0HV0etK5x-66ophi70HTqCFv8raedQkmpY },
];

export async function POST(request: Request) {
  try {
    const { nid, email, name } = await request.json();
    
    // إنشاء كود OTP من 6 أرقام
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = Date.now() + 10 * 60 * 1000;

    // تحديث قاعدة البيانات بالكود
    const { error: dbError } = await supabase
      .from('students')
      .update({ otp_data: { otp, expiresAt } })
      .eq('nid', nid);

    if (dbError) throw new Error('خطأ في قاعدة البيانات');

    // اختيار حساب إيميل للتبديل (هنا نختار بناءً على رقم عشوائي)
    const accountIndex = Math.floor(Math.random() * emailAccounts.length);
    const account = emailAccounts[accountIndex];

    // إعداد Nodemailer للعمل بنظام OAuth2
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        type: 'OAuth2',
        user: account.user,
        clientId: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        refreshToken: account.refreshToken,
      }
    });

    const mailOptions = {
      from: `"نظام ابن الهيثم - العلاج الطبيعي" <${account.user}>`,
      to: email,
      subject: 'كود تفعيل البريد الإلكتروني - نظام ابن الهيثم',
      html: `
        <div dir="rtl" style="font-family: Arial, sans-serif; text-align: center; background-color: #f3f4f6; padding: 30px; border-radius: 10px;">
          <h2 style="color: #1f2937;">مرحباً ${name}</h2>
          <p style="font-size: 16px; color: #4b5563;">طلبك لتسجيل البريد الإلكتروني قيد التنفيذ. استخدم الكود التالي لتفعيل حسابك:</p>
          <div style="margin: 20px auto; background-color: #2563eb; color: #ffffff; font-size: 32px; font-weight: bold; padding: 15px 30px; border-radius: 8px; display: inline-block; letter-spacing: 5px;">
            ${otp}
          </div>
          <p style="font-size: 14px; color: #ef4444;">هذا الكود صالح لمدة 10 دقائق فقط.</p>
        </div>
      `
    };

    await transporter.sendMail(mailOptions);
    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Email send error:', error);
    return NextResponse.json({ success: false, error: 'حدث خطأ أثناء الإرسال' }, { status: 500 });
  }
}
