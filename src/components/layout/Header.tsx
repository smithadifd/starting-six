'use client';

import { Swords } from 'lucide-react';
import { UserMenu } from './UserMenu';

interface HeaderProps {
  userName: string;
  userEmail: string;
}

export function Header({ userName, userEmail }: HeaderProps) {
  return (
    <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-12 items-center justify-between px-4">
        {/* Logo — visible on mobile (sidebar hidden) */}
        <div className="flex items-center gap-2 lg:hidden">
          <Swords className="h-5 w-5 text-red-400" />
          <span className="font-bold">Starting Six</span>
        </div>

        <div className="hidden lg:block" />

        <UserMenu userName={userName} userEmail={userEmail} />
      </div>
    </header>
  );
}