'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { BarChart3, Shield, Swords, Users, Sparkles, AlertTriangle, ChevronDown, ChevronUp } from 'lucide-react';
import { TYPE_COLORS } from '../../../tailwind.config';
import type { PokemonType } from '@/types';
import { POKEMON_TYPES } from '@/types';

interface DefenseByType {
  weak: number;
  resist: number;
  immune: number;
}

interface CoverageEntry {
  covered: boolean;
  coveredBy: string[];
}

interface RoleResult {
  name: string;
  roles: string[];
  bst: number;
}

interface AbilityHighlight {
  pokemonName: string;
  abilityName: string;
  effect: string;
}

interface AnalysisData {
  defense: {
    byType: Record<PokemonType, DefenseByType>;
    sharedWeaknesses: PokemonType[];
    uncoveredTypes: PokemonType[];
  };
  offense: {
    coverage: Record<PokemonType, CoverageEntry>;
    uncoveredTypes: PokemonType[];
    coveragePercent: number;
  };
  roles: RoleResult[];
  abilities: AbilityHighlight[];
  teamSize: number;
}

interface TeamAnalysisProps {
  playthroughId: number;
  teamSize: number;
  /** Increment to trigger re-fetch (e.g. on swap, bench, activate) */
  teamRevision?: number;
}

export function TeamAnalysis({ playthroughId, teamSize, teamRevision = 0 }: TeamAnalysisProps) {
  const [data, setData] = useState<AnalysisData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(true);
  const prevRevision = useRef(teamRevision);

  // Re-fetch when team composition changes if analysis was already loaded
  useEffect(() => {
    if (prevRevision.current !== teamRevision && data) {
      fetchAnalysis();
    }
    prevRevision.current = teamRevision;
  });

  const fetchAnalysis = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/playthroughs/${playthroughId}/analysis`);
      const json = await res.json();
      if (!res.ok) {
        setError(json.error || 'Failed to load analysis');
        return;
      }
      setData(json.data);
      setExpanded(true);
    } catch {
      setError('Failed to load analysis');
    } finally {
      setLoading(false);
    }
  }, [playthroughId]);

  if (teamSize === 0) return null;

  return (
    <div className="rounded-xl ghost-border bg-card">
      <button
        onClick={() => {
          if (!data && !loading) fetchAnalysis();
          else setExpanded(!expanded);
        }}
        className="w-full flex items-center justify-between p-5 hover:bg-white/[0.02] transition-colors rounded-xl"
      >
        <div className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-red-500" />
          <h2 className="text-lg font-headline font-bold">Team Analysis</h2>
        </div>
        {data ? (
          expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />
        ) : loading ? (
          <span className="text-sm text-muted-foreground font-label">Loading...</span>
        ) : (
          <span className="text-sm text-muted-foreground font-label">Click to analyze</span>
        )}
      </button>

      {error && (
        <div className="px-5 pb-4 text-sm text-red-400">{error}</div>
      )}

      {data && expanded && (
        <div className="px-5 pb-5 space-y-8">
          <DefenseSection defense={data.defense} />
          <OffenseSection offense={data.offense} />
          <RolesSection roles={data.roles} />
          {data.abilities.length > 0 && (
            <AbilitiesSection abilities={data.abilities} />
          )}
        </div>
      )}
    </div>
  );
}

// ===========================================
// Defense Section
// ===========================================

function DefenseSection({ defense }: { defense: AnalysisData['defense'] }) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <Shield className="h-4 w-4 text-blue-400" />
        <h3 className="font-headline font-bold">Defensive Coverage</h3>
      </div>

      {defense.sharedWeaknesses.length > 0 && (
        <div className="mb-4 flex items-start gap-3 p-4 rounded-xl bg-red-500/10 border border-red-500/20">
          <AlertTriangle className="h-5 w-5 text-red-400 shrink-0 mt-0.5" />
          <div className="text-sm">
            <span className="text-red-400 font-headline font-bold">Heads up, Trainer! </span>
            <span className="text-muted-foreground">Shared weaknesses: </span>
            {defense.sharedWeaknesses.map((t, i) => (
              <span key={t}>
                {i > 0 && ', '}
                <TypePill type={t} />
              </span>
            ))}
          </div>
        </div>
      )}

      {defense.uncoveredTypes.length > 0 && (
        <div className="mb-4 flex items-start gap-3 p-4 rounded-xl bg-yellow-500/10 border border-yellow-500/20">
          <AlertTriangle className="h-4 w-4 text-yellow-400 shrink-0 mt-0.5" />
          <div className="text-sm">
            <span className="text-yellow-400 font-bold">No resistance to: </span>
            {defense.uncoveredTypes.map((t, i) => (
              <span key={t}>
                {i > 0 && ', '}
                <TypePill type={t} />
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
        {POKEMON_TYPES.map((type) => {
          const { weak, resist, immune } = defense.byType[type];
          return (
            <div key={type} className="text-center p-2 rounded-xl bg-surface-bright/50">
              <TypePill type={type} />
              <div className="mt-1.5 text-xs font-label space-x-1">
                {weak > 0 && <span className="text-red-400">{weak}W</span>}
                {resist > 0 && <span className="text-green-400">{resist}R</span>}
                {immune > 0 && <span className="text-blue-400">{immune}I</span>}
                {weak === 0 && resist === 0 && immune === 0 && (
                  <span className="text-muted-dim">-</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ===========================================
// Offense Section
// ===========================================

function OffenseSection({ offense }: { offense: AnalysisData['offense'] }) {
  const pct = Math.round(offense.coveragePercent * 100);

  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <Swords className="h-4 w-4 text-orange-400" />
        <h3 className="font-headline font-bold">Offensive Coverage</h3>
        <span className="text-sm text-muted-foreground font-label ml-auto">{pct}%</span>
      </div>

      {/* Coverage bar */}
      <div className="w-full h-2.5 rounded-full bg-surface-bright mb-4">
        <div
          className="h-2.5 rounded-full transition-all"
          style={{
            width: `${pct}%`,
            backgroundColor: pct >= 80 ? '#22c55e' : pct >= 50 ? '#eab308' : '#ef4444',
            boxShadow: `0 0 10px ${pct >= 80 ? 'rgba(34,197,94,0.4)' : pct >= 50 ? 'rgba(234,179,8,0.4)' : 'rgba(239,68,68,0.4)'}`,
          }}
        />
      </div>

      {offense.uncoveredTypes.length > 0 && (
        <div className="mb-4 flex items-start gap-3 p-4 rounded-xl bg-yellow-500/10 border border-yellow-500/20">
          <AlertTriangle className="h-4 w-4 text-yellow-400 shrink-0 mt-0.5" />
          <div className="text-sm">
            <span className="text-yellow-400 font-bold">Cannot hit super-effectively: </span>
            {offense.uncoveredTypes.map((t, i) => (
              <span key={t}>
                {i > 0 && ', '}
                <TypePill type={t} />
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
        {POKEMON_TYPES.map((type) => {
          const entry = offense.coverage[type];
          return (
            <div
              key={type}
              className={`text-center p-2 rounded-xl ${entry.covered ? 'bg-green-500/10 border border-green-500/15' : 'bg-surface-bright/50'}`}
            >
              <TypePill type={type} />
              <div className="mt-1.5 text-xs font-label">
                {entry.covered ? (
                  <span className="text-green-400" title={entry.coveredBy.join(', ')}>
                    {entry.coveredBy.length}x
                  </span>
                ) : (
                  <span className="text-muted-dim">-</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ===========================================
// Roles Section
// ===========================================

function RolesSection({ roles }: { roles: RoleResult[] }) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <Users className="h-4 w-4 text-purple-400" />
        <h3 className="font-headline font-bold">Team Roles</h3>
      </div>

      <div className="space-y-3">
        {roles.map((r) => (
          <div key={r.name} className="flex items-center gap-2 text-sm">
            <span className="font-headline font-bold min-w-[120px]">{r.name}</span>
            <div className="flex flex-wrap gap-1">
              {r.roles.map((role) => (
                <span
                  key={role}
                  className="px-2.5 py-0.5 rounded-full text-xs font-label bg-surface-bright border border-white/[0.08]"
                >
                  {role}
                </span>
              ))}
            </div>
            <span className="text-xs text-muted-dim font-label ml-auto">BST {r.bst}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ===========================================
// Abilities Section
// ===========================================

function AbilitiesSection({ abilities }: { abilities: AbilityHighlight[] }) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <Sparkles className="h-4 w-4 text-yellow-400" />
        <h3 className="font-headline font-bold">Notable Abilities</h3>
      </div>

      <div className="space-y-2">
        {abilities.map((a) => (
          <div key={`${a.pokemonName}-${a.abilityName}`} className="text-sm p-3 rounded-xl bg-surface-bright/50">
            <div className="flex items-center gap-2">
              <span className="font-headline font-bold">{a.pokemonName}</span>
              <span className="text-muted-dim">—</span>
              <span className="text-yellow-400 font-label font-bold">{a.abilityName}</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">{a.effect}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ===========================================
// Shared: inline type pill
// ===========================================

function TypePill({ type }: { type: string }) {
  const color = TYPE_COLORS[type] ?? '#888888';
  return (
    <span
      className="inline-block px-2 py-0.5 rounded-full text-[10px] font-label font-bold uppercase text-white"
      style={{ backgroundColor: color }}
    >
      {type}
    </span>
  );
}
