// app/layout.tsx
import './globals.css'; // تأكد من وجود هذا الملف الذي يحتوي على إعدادات Tailwind
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'بريد الكتروني نظام ابن الهيثم',
  description: 'إضافة وتفعيل البريد الإلكتروني للطلاب - كلية العلاج الطبيعي جامعة قنا',
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
