'use client';

import { Swords } from 'lucide-react';
import { UserMenu } from './UserMenu';

interface HeaderProps {
  userName: string;
  userEmail: string;
}

export function Header({ userName, userEmail }: HeaderProps) {
  return (
    <header className="sticky top-0 z-40 glass-panel border-b border-white/[0.05] shadow-[0_4px_30px_rgba(239,68,68,0.06)]">
      <div className="flex h-12 items-center justify-between px-4">
        {/* Logo — visible on mobile (sidebar hidden) */}
        <div className="flex items-center gap-2 lg:hidden">
          <Swords className="h-5 w-5 text-red-500" />
          <span className="font-headline font-bold tracking-tight">Starting Six</span>
        </div>

        <div className="hidden lg:block" />

        <UserMenu userName={userName} userEmail={userEmail} />
      </div>
    </header>
  );
}
