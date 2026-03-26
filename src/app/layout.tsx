import type { Metadata, Viewport } from 'next';
import { Plus_Jakarta_Sans, Manrope, Space_Grotesk } from 'next/font/google';
import './globals.css';
import { LayoutShell } from '@/components/layout/LayoutShell';
import { PwaProvider } from '@/components/layout/PwaProvider';
import { DemoBanner } from '@/components/layout/DemoBanner';
import { getSession } from '@/lib/auth-helpers';

const jakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['700', '800'],
  variable: '--font-jakarta',
});

const manrope = Manrope({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-manrope',
});

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  weight: ['500', '700'],
  variable: '--font-space',
});

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Starting Six — Pokémon Team Builder',
  description: 'Build and analyze your Pokémon team for any game playthrough.',
  manifest: '/manifest.json',
  icons: {
    icon: '/favicon.ico',
    apple: '/apple-touch-icon.png',
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
  themeColor: '#0E0E0E',
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
      <body className={`${jakarta.variable} ${manrope.variable} ${spaceGrotesk.variable} font-body`}>
        <DemoBanner />
        <PwaProvider>
          <LayoutShell user={user}>
            {children}
          </LayoutShell>
        </PwaProvider>
      </body>
    </html>
  );
}
