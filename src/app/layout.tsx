import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { LayoutShell } from '@/components/layout/LayoutShell';
import { getSession } from '@/lib/auth-helpers';

const inter = Inter({ subsets: ['latin'] });

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Starting Six — Pokémon Team Builder',
  description: 'Build and analyze your Pokémon team for any game playthrough.',
  manifest: '/manifest.json',
  icons: {
    icon: '/favicon.ico',
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Starting Six',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#1a1a2e',
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  let user: { name: string; email: string } | null = null;
  try {
    const session = await getSession();
    if (session?.user) {
      user = { name: session.user.name, email: session.user.email };
    }
  } catch {
    // No session (build time or auth pages)
  }

  return (
    <html lang="en" className="dark">
      <body className={inter.className}>
        <LayoutShell user={user}>
          {children}
        </LayoutShell>
      </body>
    </html>
  );
}