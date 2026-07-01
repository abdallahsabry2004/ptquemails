// app/layout.tsx
import './globals.css'; // تأكد من وجود هذا الملف الذي يحتوي على إعدادات Tailwind
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'نظام ابن الهيثم - العلاج الطبيعي',
  description: 'إضافة وتفعيل البريد الإلكتروني للطلاب - كلية العلاج الطبيعي جامعة جنوب الوادي',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ar" dir="rtl">
      <body>{children}</body>
    </html>
  );
}
