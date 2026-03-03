'use client';

import { useRouter } from 'next/navigation';
import { User, LogOut, Settings } from 'lucide-react';
import { authClient } from '@/lib/auth-client';

interface UserMenuProps {
  userName: string;
  userEmail: string;
}

export function UserMenu({ userName, userEmail }: UserMenuProps) {
  const router = useRouter();

  async function handleSignOut() {
    await authClient.signOut();
    router.push('/login');
  }

  return (
    <div className="relative group">
      <button
        className="flex items-center gap-2 rounded-full p-1 hover:bg-secondary/50 transition-colors"
        aria-label="User menu"
      >
        <div className="h-8 w-8 rounded-full bg-secondary flex items-center justify-center">
          <User className="h-4 w-4" />
        </div>
        <span className="hidden lg:block text-sm font-medium truncate max-w-[120px]">
          {userName}
        </span>
      </button>

      {/* Dropdown */}
      <div className="absolute right-0 top-full mt-1 w-48 rounded-md border border-border bg-card shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
        <div className="p-3 border-b border-border">
          <p className="text-sm font-medium truncate">{userName}</p>
          <p className="text-xs text-muted-foreground truncate">{userEmail}</p>
        </div>
        <div className="p-1">
          <a
            href="/settings"
            className="flex items-center gap-2 px-3 py-2 text-sm rounded-md hover:bg-secondary/50 transition-colors"
          >
            <Settings className="h-4 w-4" />
            Settings
          </a>
          <button
            onClick={handleSignOut}
            className="flex w-full items-center gap-2 px-3 py-2 text-sm rounded-md hover:bg-destructive/10 text-destructive transition-colors"
          >
            <LogOut className="h-4 w-4" />
            Sign Out
          </button>
        </div>
      </div>
    </div>
  );
}