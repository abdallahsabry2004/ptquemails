import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// نستخدم مفتاح السيرفر (SERVICE_ROLE_KEY) لضمان صلاحية التعديل في قاعدة البيانات
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

export async function POST(request: Request) {
  try {
    const { nid, otp, email } = await request.json();

    // 1. جلب الكود المسجل للطالب من قاعدة البيانات
    const { data: student, error: fetchError } = await supabase
      .from('students')
      .select('otp_data')
      .eq('nid', String(nid).trim())
      .single();

    if (fetchError || !student || !student.otp_data) {
      return NextResponse.json({ success: false, message: 'لم يتم العثور على طلب تفعيل مسبق.' });
    }

    const storedOtp = student.otp_data.otp;
    const expiresAt = student.otp_data.expiresAt;

    // 2. التحقق من انتهاء الصلاحية
    if (Date.now() > expiresAt) {
      return NextResponse.json({ success: false, message: 'الكود منتهي الصلاحية، يرجى إرسال كود جديد.' });
    }

    // 3. التحقق من تطابق الكود (نحول الطرفين لنص لضمان التطابق التام)
    if (String(storedOtp).trim() !== String(otp).trim()) {
      return NextResponse.json({ success: false, message: 'الكود غير صحيح، يرجى التأكد من الأرقام.' });
    }

    // 4. الكود صحيح: نقوم بتحديث الإيميل وتفريغ خانة الـ OTP
    const { error: updateError } = await supabase
      .from('students')
      .update({
        email: email,
        otp_data: null, // تفريغ الكود حتى لا يستخدم مرة أخرى
        reg_time: new Date().toISOString()
      })
      .eq('nid', String(nid).trim());

    if (updateError) {
      throw new Error('حدث خطأ أثناء حفظ البيانات');
    }

    return NextResponse.json({ success: true, message: 'تم تفعيل البريد الإلكتروني بنجاح.' });

  } catch (error) {
    console.error('Verify OTP Error:', error);
    return NextResponse.json({ success: false, message: 'حدث خطأ في النظام، يرجى المحاولة لاحقاً.' }, { status: 500 });
  }
}
