'use client';

import { useState, useRef, useEffect } from 'react';
import { ChevronDown, X } from 'lucide-react';
import { POKEMON_TYPES } from '@/types';
import { TYPE_COLORS } from '../../../tailwind.config';

interface TeraTypeSelectorProps {
  currentType: string | null;
  onSelect: (type: string | null) => void;
}

export function TeraTypeSelector({ currentType, onSelect }: TeraTypeSelectorProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  return (
    <div ref={containerRef} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between gap-1 rounded-md border border-input bg-background px-2 py-1.5 text-xs hover:bg-secondary/50 transition-colors"
      >
        {currentType ? (
          <span className="flex items-center gap-1.5">
            <span
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: TYPE_COLORS[currentType] ?? '#888' }}
            />
            <span className="capitalize">{currentType}</span>
          </span>
        ) : (
          <span className="text-muted-foreground">Tera Type</span>
        )}
        <ChevronDown className="h-3 w-3 text-muted-foreground shrink-0" />
      </button>

      {open && (
        <div className="absolute z-40 top-full left-0 right-0 mt-1 rounded-md border border-border bg-card shadow-lg max-h-52 overflow-y-auto">
          <div className="p-1">
            {currentType && (
              <button
                onClick={() => {
                  onSelect(null);
                  setOpen(false);
                }}
                className="w-full flex items-center gap-1.5 px-2 py-1.5 rounded text-xs text-muted-foreground hover:bg-secondary transition-colors"
              >
                <X className="h-3 w-3" />
                Clear
              </button>
            )}
            {POKEMON_TYPES.map((t) => (
              <button
                key={t}
                onClick={() => {
                  onSelect(t);
                  setOpen(false);
                }}
                className={`w-full flex items-center gap-1.5 px-2 py-1.5 rounded text-xs hover:bg-secondary transition-colors capitalize ${
                  currentType === t ? 'bg-secondary' : ''
                }`}
              >
                <span
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: TYPE_COLORS[t] ?? '#888' }}
                />
                {t}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
