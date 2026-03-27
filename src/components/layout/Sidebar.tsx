'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, BookOpen, Swords, Settings } from 'lucide-react';

const navigation = [
  { name: 'Home', href: '/', icon: LayoutDashboard },
  { name: 'Runs', href: '/playthroughs', icon: BookOpen },
  { name: 'Pokémon', href: '/pokemon', icon: Swords },
  { name: 'Settings', href: '/settings', icon: Settings },
];

function isNavActive(pathname: string, href: string): boolean {
  if (href === '/') return pathname === '/';
  return pathname === href || pathname.startsWith(href + '/');
}

function PokeballIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <circle cx="12" cy="12" r="11" stroke="currentColor" strokeWidth="2" />
      <line x1="1" y1="12" x2="8" y2="12" stroke="currentColor" strokeWidth="2" />
      <line x1="16" y1="12" x2="23" y2="12" stroke="currentColor" strokeWidth="2" />
      <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="2" />
      <circle cx="12" cy="12" r="1.5" fill="currentColor" />
    </svg>
  );
}

export function Sidebar() {
  const pathname = usePathname();

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex w-64 border-r border-white/[0.05] bg-surface-low flex-col">
        <div className="p-6 border-b border-white/[0.05]">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="w-8 h-8 rounded-full bg-red-500 flex items-center justify-center shadow-[0_0_12px_rgba(239,68,68,0.4)] group-hover:shadow-[0_0_20px_rgba(239,68,68,0.6)] transition-shadow">
              <PokeballIcon className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="text-lg font-headline font-extrabold tracking-tight block leading-none">Starting Six</span>
              <span className="text-[10px] text-muted-dim font-label tracking-widest uppercase">Team Builder</span>
            </div>
          </Link>
        </div>

        <nav className="flex-1 p-4 space-y-1.5">
          {navigation.map((item) => {
            const isActive = isNavActive(pathname, item.href);
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-headline font-bold transition-all ${
                  isActive
                    ? 'bg-red-500 text-white shadow-[0_0_20px_rgba(239,68,68,0.3)]'
                    : 'text-muted-foreground hover:text-foreground hover:bg-white/[0.05]'
                }`}
              >
                <item.icon className={`h-4 w-4 ${isActive ? '' : 'opacity-60'}`} />
                {item.name}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-white/[0.05]">
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-green-500 shadow-[0_0_6px_rgba(34,197,94,0.5)]" />
            <p className="text-[10px] text-muted-dim font-label tracking-wider">v0.1.0</p>
          </div>
        </div>
      </aside>

      {/* Mobile bottom tab bar */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 glass-panel border-t border-white/[0.05] safe-bottom">
        <div className="flex items-center justify-around h-16">
          {navigation.map((item) => {
            const isActive = isNavActive(pathname, item.href);
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex flex-col items-center justify-center gap-0.5 flex-1 min-w-0 h-full font-label text-[11px] font-medium transition-all ${
                  isActive ? 'text-red-500' : 'text-muted-foreground'
                }`}
              >
                <div className={`relative ${isActive ? '' : ''}`}>
                  <item.icon className={`h-5 w-5 ${isActive ? 'drop-shadow-[0_0_8px_rgba(239,68,68,0.6)]' : ''}`} />
                  {isActive && (
                    <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-red-500 shadow-[0_0_4px_rgba(239,68,68,0.8)]" />
                  )}
                </div>
                {item.name}
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
