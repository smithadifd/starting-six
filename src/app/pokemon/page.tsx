import { redirect } from 'next/navigation';
import { requireUserId } from '@/lib/auth-helpers';
import { PokemonGrid } from '@/components/pokemon/PokemonGrid';

export const dynamic = 'force-dynamic';

export default async function PokemonPage() {
  try {
    await requireUserId();
  } catch {
    redirect('/login');
  }

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Pokémon</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Browse all Pokémon — search, filter by type or generation
        </p>
      </div>
      <PokemonGrid />
    </div>
  );
}
