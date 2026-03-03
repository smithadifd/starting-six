'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const settingsTabs = [
  { name: 'General', href: '/settings' },
  { name: 'System', href: '/settings/system' },
];

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-1">Settings</h1>
      <p className="text-sm text-muted-foreground mb-6">
        Configure your Starting Six preferences
      </p>

      <nav className="flex gap-1 border-b border-border mb-6">
        {settingsTabs.map((tab) => {
          const isActive = pathname === tab.href;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                isActive
                  ? 'border-red-400 text-foreground'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              {tab.name}
            </Link>
          );
        })}
      </nav>

      {children}
    </div>
  );
}
