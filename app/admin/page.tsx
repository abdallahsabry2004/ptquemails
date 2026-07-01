'use client';
import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import * as XLSX from 'xlsx';

// تهيئة Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default function AdminDashboard() {
  // حالات تسجيل الدخول
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loginNid, setLoginNid] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // حالة تغيير كلمة المرور
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [passwordMsg, setPasswordMsg] = useState('');

  // بيانات الطلاب والإحصائيات
  const [students, setStudents] = useState<any[]>([]);
  const [filteredStudents, setFilteredStudents] = useState<any[]>([]);
  const [loadingData, setLoadingData] = useState(false);
  const [years, setYears] = useState<string[]>([]);

  // الفلاتر
  const [filterYear, setFilterYear] = useState('الكل');
  const [filterStatus, setFilterStatus] = useState('الكل');
  const [searchQuery, setSearchQuery] = useState('');

  // 1. دالة تسجيل الدخول
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoggingIn(true);
    setLoginError('');

    const { data, error } = await supabase
      .from('admins')
      .select('*')
      .eq('nid', loginNid)
      .eq('password', loginPassword)
      .single();

    if (error || !data) {
      setLoginError('الرقم القومي أو كلمة المرور غير صحيحة');
    } else {
      setIsAuthenticated(true);
      fetchData(); // جلب البيانات فور تسجيل الدخول
    }
    setIsLoggingIn(false);
  };

  // 2. دالة تغيير كلمة المرور
  const handleChangePassword = async () => {
    if (newPassword.length < 6) {
      setPasswordMsg('كلمة المرور يجب أن تكون 6 أحرف/أرقام على الأقل');
      return;
    }
    setPasswordMsg('جاري التحديث...');
    const { error } = await supabase
      .from('admins')
      .update({ password: newPassword })
      .eq('nid', loginNid);

    if (error) {
      setPasswordMsg('حدث خطأ أثناء التحديث');
    } else {
      setPasswordMsg('تم تغيير كلمة المرور بنجاح!');
      setTimeout(() => setShowPasswordModal(false), 2000);
    }
  };

  // 3. دالة جلب البيانات من قاعدة البيانات باستخدام حلقة (Loop) لتخطي حد الـ 1000
  const fetchData = async () => {
    setLoadingData(true);
    
    let allData: any[] = [];
    let hasMoreData = true;
    let start = 0;
    const limit = 1000;

    while (hasMoreData) {
      const { data, error } = await supabase
        .from('students')
        .select('*')
        .order('code', { ascending: true })
        .range(start, start + limit - 1);

      if (error) {
        console.error('Error fetching data:', error);
        break;
      }

      if (data && data.length > 0) {
        allData = [...allData, ...data];
        start += limit;
      }

      // إذا كانت البيانات الراجعة أقل من الحد الأقصى، إذن انتهت البيانات
      if (!data || data.length < limit) {
        hasMoreData = false;
      }
    }

    setStudents(allData);
    setFilteredStudents(allData);
    
    // استخراج سنوات الالتحاق بدون تكرار
    const uniqueYears = Array.from(new Set(allData.map(s => s.year).filter(Boolean))) as string[];
    setYears(uniqueYears.sort());
    
    setLoadingData(false);
  };

  // 4. تطبيق الفلاتر عند تغيير أي فلتر
  useEffect(() => {
    let result = students;

    // فلتر السنة
    if (filterYear !== 'الكل') {
      result = result.filter(s => s.year === filterYear);
    }

    // فلتر الحالة
    if (filterStatus === 'مسجل') {
      result = result.filter(s => s.email && s.email.trim() !== '');
    } else if (filterStatus === 'غير مسجل') {
      result = result.filter(s => !s.email || s.email.trim() === '');
    }

    // فلتر البحث (بالاسم أو الرقم القومي أو الكود)
    if (searchQuery) {
      result = result.filter(s => 
        s.name?.includes(searchQuery) || 
        s.nid?.includes(searchQuery) || 
        s.code?.includes(searchQuery)
      );
    }

    setFilteredStudents(result);
  }, [filterYear, filterStatus, searchQuery, students]);

  // 5. دالة تصدير البيانات إلى Excel (XLSX)
  const exportToExcel = (dataToExport: any[], filename: string) => {
    // تنسيق البيانات بنفس ترتيب الأعمدة المطلوب مع تعريب العناوين
    const formattedData = dataToExport.map(s => ({
      'الإيميل (email)': s.email || 'لم يسجل',
      'كود الطالب (code)': s.code,
      'اسم الطالب (name)': s.name,
      'الرقم القومي (nid)': s.nid,
      'عام الالتحاق (year)': s.year,
      'وقت وتاريخ التسجيل (reg_time)': s.reg_time ? new Date(s.reg_time).toLocaleString('ar-EG') : 'غير متوفر'
    }));

    const worksheet = XLSX.utils.json_to_sheet(formattedData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "الطلاب");
    
    // تحميل الملف
    XLSX.writeFile(workbook, `${filename}.xlsx`);
  };

  // دالة الطباعة (PDF)
  const handlePrint = () => {
    window.print();
  };

  // إحصائيات سريعة
  const totalStudents = students.length;
  const registeredStudents = students.filter(s => s.email && s.email.trim() !== '').length;
  const unregisteredStudents = totalStudents - registeredStudents;

  // ==========================================
  // واجهة تسجيل الدخول (إذا لم يسجل دخول بعد)
  // ==========================================
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4 dir-rtl text-right" dir="rtl">
        <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md border-t-4 border-blue-800">
          <h1 className="text-2xl font-bold text-center text-blue-900 mb-2">لوحة تحكم الإدارة</h1>
          <p className="text-center text-gray-500 mb-8">نظام ابن الهيثم - العلاج الطبيعي</p>
          
          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <label className="block text-gray-700 font-bold mb-2">الرقم القومي للمسؤول</label>
              <input 
                type="text" 
                value={loginNid}
                onChange={(e) => setLoginNid(e.target.value)}
                className="w-full px-4 py-3 rounded-lg border focus:ring-2 focus:ring-blue-500 outline-none text-left dir-ltr"
                required
              />
            </div>
            <div>
              <label className="block text-gray-700 font-bold mb-2">كلمة المرور</label>
              <input 
                type="password" 
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                className="w-full px-4 py-3 rounded-lg border focus:ring-2 focus:ring-blue-500 outline-none text-left dir-ltr"
                required
              />
            </div>
            {loginError && <p className="text-red-600 text-sm font-bold">{loginError}</p>}
            <button 
              type="submit" 
              disabled={isLoggingIn}
              className="w-full bg-blue-800 text-white font-bold py-3 rounded-lg hover:bg-blue-900 transition"
            >
              {isLoggingIn ? 'جاري التحقق...' : 'دخول'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // ==========================================
  // واجهة لوحة التحكم (الرئيسية)
  // ==========================================
  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8 dir-rtl text-right" dir="rtl">
      
      {/* ستايل الطباعة (يتم تطبيقه فقط عند الطباعة) */}
      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          body * {
            visibility: hidden;
          }
          #print-area, #print-area * {
            visibility: visible;
          }
          #print-area {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            direction: rtl;
          }
          .no-print {
            display: none !important;
          }
          @page {
            margin: 1cm;
          }
        }
      `}} />

      {/* النافذة المنبثقة لتغيير الباسورد */}
      {showPasswordModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 no-print">
          <div className="bg-white p-6 rounded-xl shadow-2xl w-full max-w-sm">
            <h3 className="text-lg font-bold mb-4">تغيير كلمة المرور</h3>
            <input 
              type="text" 
              placeholder="كلمة المرور الجديدة"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full px-4 py-2 border rounded-lg mb-4 text-left dir-ltr outline-none focus:ring-2 focus:ring-blue-500"
            />
            {passwordMsg && <p className="text-sm font-bold text-blue-600 mb-4">{passwordMsg}</p>}
            <div className="flex gap-2">
              <button onClick={handleChangePassword} className="bg-green-600 text-white px-4 py-2 rounded-lg flex-1 hover:bg-green-700">تحديث</button>
              <button onClick={() => setShowPasswordModal(false)} className="bg-gray-300 text-gray-800 px-4 py-2 rounded-lg flex-1 hover:bg-gray-400">إلغاء</button>
            </div>
          </div>
        </div>
      )}

      {/* الترويسة العلوية */}
      <div className="flex flex-col md:flex-row justify-between items-center bg-white p-6 rounded-xl shadow-sm mb-8 border-b-4 border-blue-800 no-print">
        <div>
          <h1 className="text-2xl font-bold text-blue-900">لوحة تحكم النظام</h1>
          <p className="text-gray-500 text-sm mt-1">مرحباً بك د. عبدالله صبري</p>
        </div>
        <div className="flex gap-4 mt-4 md:mt-0">
          <button onClick={() => setShowPasswordModal(true)} className="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg font-bold hover:bg-gray-300 transition text-sm">
            تغيير كلمة المرور
          </button>
          <button onClick={() => window.location.reload()} className="bg-red-100 text-red-700 px-4 py-2 rounded-lg font-bold hover:bg-red-200 transition text-sm">
            خروج
          </button>
        </div>
      </div>

      {/* الإحصائيات السريعة */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8 no-print">
        <div className="bg-white p-6 rounded-xl shadow-sm border-r-4 border-blue-500">
          <p className="text-gray-500 font-bold mb-1">إجمالي الطلاب</p>
          <p className="text-3xl font-black text-gray-800">{totalStudents}</p>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border-r-4 border-green-500">
          <p className="text-gray-500 font-bold mb-1">الطلاب المسجلين للإيميل</p>
          <p className="text-3xl font-black text-green-600">{registeredStudents}</p>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border-r-4 border-red-500">
          <p className="text-gray-500 font-bold mb-1">لم يسجلوا بعد</p>
          <p className="text-3xl font-black text-red-600">{unregisteredStudents}</p>
        </div>
      </div>

      {/* شريط الفلاتر وأزرار التصدير والطباعة */}
      <div className="bg-white p-6 rounded-xl shadow-sm mb-6 flex flex-col md:flex-row gap-4 items-center justify-between no-print">
        <div className="flex flex-col md:flex-row gap-4 w-full md:w-auto">
          <input 
            type="text" 
            placeholder="بحث بالاسم، الرقم القومي..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="px-4 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-blue-500 w-full md:w-64"
          />
          <select 
            value={filterStatus} 
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-4 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-blue-500 bg-white cursor-pointer"
          >
            <option value="الكل">جميع الحالات</option>
            <option value="مسجل">المسجلين فقط</option>
            <option value="غير مسجل">غير المسجلين</option>
          </select>
          <select 
            value={filterYear} 
            onChange={(e) => setFilterYear(e.target.value)}
            className="px-4 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-blue-500 bg-white cursor-pointer"
          >
            <option value="الكل">كل سنوات الالتحاق</option>
            {years.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>

        <div className="flex gap-2 w-full md:w-auto flex-wrap justify-end">
          <button 
            onClick={handlePrint}
            className="bg-gray-800 text-white px-4 py-2 rounded-lg font-bold hover:bg-gray-900 transition flex-1 md:flex-none text-sm"
          >
            🖨️ طباعة / PDF
          </button>
          <button 
            onClick={() => exportToExcel(filteredStudents, 'النتيجة_الحالية')}
            className="bg-green-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-green-700 transition flex-1 md:flex-none text-sm"
          >
            تحميل النتيجة (Excel)
          </button>
          <button 
            onClick={() => exportToExcel(students, 'قاعدة_البيانات_الكاملة')}
            className="bg-blue-800 text-white px-4 py-2 rounded-lg font-bold hover:bg-blue-900 transition flex-1 md:flex-none text-sm"
          >
            تحميل الكل (Excel)
          </button>
        </div>
      </div>

      {/* منطقة الطباعة والجدول */}
      <div id="print-area" className="bg-white rounded-xl shadow-sm overflow-hidden">
        
        {/* الترويسة التي تظهر فقط عند الطباعة */}
        <div className="hidden print:block text-center p-6 border-b-2 border-gray-800 mb-4">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold">جامعة جنوب الوادي - كلية العلاج الطبيعي</h2>
            <p className="text-sm font-bold text-gray-600 border border-gray-400 p-2 rounded">
              برمجة وتطوير: د. عبدالله صبري
            </p>
          </div>
          <h1 className="text-2xl font-bold mt-4 underline">
            {filterStatus === 'الكل' ? 'كشف بجميع الطلاب' : `كشف بالطلاب (${filterStatus})`} 
            {filterYear !== 'الكل' && ` - عام الالتحاق: ${filterYear}`}
          </h1>
          <p className="text-gray-600 mt-2">إجمالي العدد المطبوع: {filteredStudents.length} طالب</p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-right border-collapse">
            <thead>
              <tr className="bg-gray-100 text-gray-700 border-b print:bg-gray-200">
                <th className="p-4 font-bold border print:border-gray-800">#</th>
                <th className="p-4 font-bold border print:border-gray-800">اسم الطالب</th>
                <th className="p-4 font-bold border print:border-gray-800">كود الطالب</th>
                <th className="p-4 font-bold border print:border-gray-800">الرقم القومي</th>
                <th className="p-4 font-bold border print:border-gray-800">البريد الإلكتروني</th>
                <th className="p-4 font-bold text-center border print:border-gray-800">عام الالتحاق</th>
                <th className="p-4 font-bold text-center border print:border-gray-800 no-print">حالة التسجيل</th>
              </tr>
            </thead>
            <tbody>
              {loadingData ? (
                <tr>
                  <td colSpan={7} className="text-center p-8 text-gray-500 font-bold">جاري تحميل البيانات بالكامل...</td>
                </tr>
              ) : filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center p-8 text-gray-500 font-bold">لا يوجد بيانات مطابقة للبحث</td>
                </tr>
              ) : (
                filteredStudents.map((student, index) => (
                  <tr key={student.nid} className="border-b hover:bg-gray-50 transition print:break-inside-avoid">
                    <td className="p-4 text-gray-500 border print:border-gray-400">{index + 1}</td>
                    <td className="p-4 font-bold text-gray-800 border print:border-gray-400">{student.name}</td>
                    <td className="p-4 text-gray-600 border print:border-gray-400">{student.code}</td>
                    <td className="p-4 text-gray-600 border print:border-gray-400">{student.nid}</td>
                    <td className="p-4 text-blue-600 dir-ltr text-left font-medium border print:border-gray-400">{student.email || '-'}</td>
                    <td className="p-4 text-center text-gray-600 border print:border-gray-400">{student.year}</td>
                    <td className="p-4 text-center no-print">
                      {student.email ? (
                        <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-bold">مسجل</span>
                      ) : (
                        <span className="bg-red-100 text-red-700 px-3 py-1 rounded-full text-xs font-bold">غير مسجل</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="bg-gray-50 p-4 border-t text-sm text-gray-500 font-bold no-print">
          عرض {filteredStudents.length} من أصل {totalStudents} طالب مسجل بقاعدة البيانات
        </div>
      </div>

    </div>
  );
}
