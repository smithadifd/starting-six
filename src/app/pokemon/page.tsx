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
      <div className="mb-10">
        <h1 className="text-4xl md:text-5xl font-headline font-extrabold tracking-tighter">
          Pokémon
        </h1>
        <p className="text-base text-muted-foreground mt-2 font-body max-w-lg">
          Browse every Pokémon across all generations. Search by name, filter by type or generation.
        </p>
      </div>
      <PokemonGrid />
    </div>
  );
}
