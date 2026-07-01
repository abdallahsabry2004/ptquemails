'use client';
import { useState } from 'react';
import { createClient } from '@supabase/supabase-js';

// تهيئة Supabase من جهة العميل
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default function Home() {
  const [nid, setNid] = useState('');
  const [student, setStudent] = useState<any>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [email, setEmail] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otpInput, setOtpInput] = useState('');
  const [loading, setLoading] = useState(false);

  // دالة إخفاء جزء من الإيميل
  const maskEmail = (emailStr: string) => {
    const [name, domain] = emailStr.split('@');
    return `${name.substring(0, 2)}****@${domain}`;
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (nid.length !== 14) {
      setErrorMsg('الرقم القومي يجب أن يتكون من 14 رقم');
      return;
    }
    setLoading(true);
    setErrorMsg('');
    
    const { data, error } = await supabase.from('students').select('*').eq('nid', nid).single();
    
    if (error || !data) {
      setErrorMsg('الطالب غير موجود. تأكد من إدخال الرقم القومي بشكل صحيح أو تواصل مع الدعم الدعم الفني.');
      setStudent(null);
    } else {
      setStudent(data);
    }
    setLoading(false);
  };

  const handleSendOtp = async () => {
    if (!email.includes('@')) return alert('يرجى إدخال بريد إلكتروني صحيح');
    setLoading(true);
    
    const res = await fetch('/api/send-otp', {
      method: 'POST',
      body: JSON.stringify({ nid: student.nid, email, name: student.name }),
      headers: { 'Content-Type': 'application/json' }
    });
    
    if (res.ok) {
      setOtpSent(true);
    } else {
      alert('حدث خطأ في إرسال الكود. حاول مرة أخرى.');
    }
    setLoading(false);
  };

  const handleVerifyOtp = async () => {
    setLoading(true);
    // جلب بيانات الـ OTP من القاعدة
    const { data } = await supabase.from('students').select('otp_data').eq('nid', student.nid).single();
    
    if (data?.otp_data?.otp === otpInput && Date.now() < data.otp_data.expiresAt) {
      // تحديث الإيميل ووقت التسجيل
      await supabase.from('students').update({
        email: email,
        reg_time: new Date().toISOString()
      }).eq('nid', student.nid);
      
      alert('تم تسجيل البريد الإلكتروني بنجاح!');
      setStudent({ ...student, email: email });
    } else {
      alert('الكود غير صحيح أو منتهي الصلاحية');
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center py-10 px-4 dir-rtl text-right" dir="rtl">
      
      {/* الترويسة والتعليمات */}
      <div className="max-w-3xl w-full bg-white rounded-xl shadow-lg p-8 mb-8 border-t-4 border-blue-600">
        <h1 className="text-2xl font-bold text-center text-blue-800 mb-6">إضافة البريد الإلكتروني لنظام ابن الهيثم</h1>
        <h2 className="text-lg font-semibold text-center text-gray-700 mb-4">كلية العلاج الطبيعي - جامعة جنوب الوادي</h2>
        
        <div className="bg-blue-50 border-r-4 border-blue-500 p-4 rounded text-sm text-gray-800 leading-relaxed font-medium">
          سيتم استخدام هذا البريد الالكتروني في نظام ابن الهيثم حتى يستطيع الطالب اعادة تعيين كلمة المرور الخاصة به من خلال هذا البريد الالكتروني المسجل ، وبالتالي يجب التأكد جيدا من صحة البريد المسجل ، وانه يعمل لدى الطالب الان ، والتأكد من عدم فقدانه فيما بعد ، حيث انه لايوجد اي طريقة اخرى لاسترجاع كلمة المرور، ويتحمل الطالب خطأ التسجيل غير الصحيح للبريد الالكتروني او فقدانه.
        </div>
      </div>

      {/* منطقة البحث وتسجيل الدخول */}
      {!student && (
        <div className="max-w-md w-full bg-white rounded-xl shadow p-6 text-center">
          <form onSubmit={handleLogin}>
            <label className="block text-gray-700 font-bold mb-2">الرقم القومي (14 رقم)</label>
            <input 
              type="text" 
              maxLength={14}
              value={nid} 
              onChange={(e) => setNid(e.target.value.replace(/[^0-9]/g, ''))}
              className="w-full px-4 py-3 rounded-lg border focus:ring-2 focus:ring-blue-500 outline-none text-center text-xl tracking-widest mb-4"
              placeholder="الرقم القومي..."
              required
            />
            <button 
              type="submit" 
              disabled={loading}
              className="w-full bg-blue-600 text-white font-bold py-3 rounded-lg hover:bg-blue-700 transition"
            >
              {loading ? 'جاري البحث...' : 'دخول'}
            </button>
          </form>

          {errorMsg && (
            <div className="mt-6">
              <p className="text-red-600 font-bold mb-4">{errorMsg}</p>
              <div className="flex justify-center gap-4">
                 <a href="https://wa.me/201113515751" target="_blank" className="bg-green-800 text-white px-6 py-2 rounded-full font-bold flex items-center gap-2 hover:bg-green-900 transition">
                    واتساب
                 </a>
                 <a href="https://t.me/Dr_Abdallah_Sabry" target="_blank" className="bg-slate-800 text-blue-400 px-6 py-2 rounded-full font-bold flex items-center gap-2 hover:bg-slate-900 transition">
                    تليجرام
                 </a>
              </div>
            </div>
          )}
        </div>
      )}

      {/* بيانات الطالب وإدخال البريد */}
      {student && (
        <div className="max-w-3xl w-full bg-white rounded-xl shadow-lg p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
            <div className="bg-gray-100 p-4 rounded-lg border border-gray-200 shadow-sm">
              <p className="text-sm text-gray-500">اسم الطالب</p>
              <p className="font-bold text-lg text-blue-900">{student.name}</p>
            </div>
            <div className="bg-gray-100 p-4 rounded-lg border border-gray-200 shadow-sm">
              <p className="text-sm text-gray-500">كود الطالب</p>
              <p className="font-bold text-lg text-blue-900">{student.code}</p>
            </div>
            <div className="bg-gray-100 p-4 rounded-lg border border-gray-200 shadow-sm">
              <p className="text-sm text-gray-500">الرقم القومي</p>
              <p className="font-bold text-lg text-blue-900">{student.nid}</p>
            </div>
            <div className="bg-gray-100 p-4 rounded-lg border border-gray-200 shadow-sm">
              <p className="text-sm text-gray-500">عام الالتحاق</p>
              <p className="font-bold text-lg text-blue-900">{student.year}</p>
            </div>
          </div>

          {student.email ? (
            <div className="bg-green-50 border border-green-200 p-6 rounded-lg text-center">
              <h3 className="text-green-700 font-bold text-xl mb-2">تم تسجيل البريد الإلكتروني مسبقاً</h3>
              <p className="text-gray-600 font-bold text-lg dir-ltr">{maskEmail(student.email)}</p>
              <p className="text-sm text-gray-500 mt-4">في حال وجود مشكلة، يرجى التواصل مع الدعم الفني.</p>
            </div>
          ) : (
            <div className="bg-blue-50 border border-blue-100 p-6 rounded-lg">
              {!otpSent ? (
                <>
                  <label className="block text-gray-800 font-bold mb-2">أدخل البريد الإلكتروني المراد تسجيله:</label>
                  <input 
                    type="email" 
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-4 py-3 rounded-lg border focus:ring-2 focus:ring-blue-500 outline-none mb-4 dir-ltr text-left"
                    placeholder="example@gmail.com"
                  />
                  <button 
                    onClick={handleSendOtp}
                    disabled={loading || !email}
                    className="w-full bg-blue-600 text-white font-bold py-3 rounded-lg hover:bg-blue-700 transition"
                  >
                    {loading ? 'جاري الإرسال...' : 'إرسال كود التفعيل'}
                  </button>
                </>
              ) : (
                <>
                  <div className="bg-yellow-50 text-yellow-800 p-4 rounded mb-4 text-center text-sm font-bold border border-yellow-200">
                    يرجى فتح البريد الإلكتروني الخاص بك ({email}) وإدخال الكود المرسل (الكود صالح لمدة 10 دقائق).
                  </div>
                  <label className="block text-gray-800 font-bold mb-2 text-center">كود التفعيل (OTP)</label>
                  <input 
                    type="text" 
                    maxLength={6}
                    value={otpInput}
                    onChange={(e) => setOtpInput(e.target.value.replace(/[^0-9]/g, ''))}
                    className="w-full px-4 py-4 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 outline-none mb-4 text-center text-3xl tracking-[1em] font-bold"
                  />
                  <button 
                    onClick={handleVerifyOtp}
                    disabled={loading || otpInput.length !== 6}
                    className="w-full bg-green-600 text-white font-bold py-3 rounded-lg hover:bg-green-700 transition"
                  >
                    {loading ? 'جاري التفعيل...' : 'تفعيل البريد الإلكتروني'}
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      )}

      {/* الفوتر المطابق للصورة */}
      <footer className="mt-auto w-full flex flex-col items-center pt-10 pb-6 bg-[#1a202c] text-white mt-12 rounded-t-3xl">
        <p className="text-gray-400 mb-6 font-bold text-sm">تم التطوير بواسطة د. عبدالله صبري</p>
        <div className="flex gap-4 mb-8">
          <a href="https://wa.me/201113515751" target="_blank" className="flex items-center gap-2 px-6 py-3 bg-[#1e293b] border border-[#334155] rounded-xl hover:bg-[#0f172a] transition duration-300">
            <span className="font-bold text-[#4ade80]">واتساب</span>
            {/* يمكنك إضافة أيقونة واتساب SVG هنا */}
          </a>
          <a href="https://t.me/Dr_Abdallah_Sabry" target="_blank" className="flex items-center gap-2 px-6 py-3 bg-[#1e293b] border border-[#334155] rounded-xl hover:bg-[#0f172a] transition duration-300">
            <span className="font-bold text-[#60a5fa]">تليجرام</span>
             {/* يمكنك إضافة أيقونة تليجرام SVG هنا */}
          </a>
        </div>
        <p className="text-gray-500 text-xs">
          Attendance System. All rights reserved 2026 ©.
        </p>
      </footer>
    </div>
  );
}
