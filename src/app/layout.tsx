import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Business Plan Manager',
  description: 'Manajemen alokasi budget, proposal, dan LPJ',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id">
      <body>{children}</body>
    </html>
  );
}
