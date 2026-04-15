import type { Metadata } from 'next';
import { AppShell } from '@/shared/presentation/app-shell';
import './globals.css';

export const metadata: Metadata = {
  title: 'musicBot',
  description: 'Chat musical minimal conectado al backend de musicBot.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
