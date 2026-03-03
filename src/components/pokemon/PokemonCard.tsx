import Link from 'next/link';
import Image from 'next/image';
import { TypeBadge } from './TypeBadge';

interface PokemonCardProps {
  pokemon: {
    slug: string;
    name: string;
    pokeapiId: number;
    typeOne: string;
    typeTwo: string | null;
    spriteDefault: string | null;
    isLegendary: boolean;
    isMythical: boolean;
  };
}

export function PokemonCard({ pokemon }: PokemonCardProps) {
  const dexNumber = pokemon.pokeapiId <= 10000
    ? `#${String(pokemon.pokeapiId).padStart(3, '0')}`
    : null;

  return (
    <Link
      href={`/pokemon/${pokemon.slug}`}
      className="group rounded-lg border border-border bg-card p-3 hover:border-red-400/50 transition-colors flex flex-col items-center"
    >
      <div className="relative w-20 h-20 sm:w-24 sm:h-24">
        {pokemon.spriteDefault ? (
          <Image
            src={pokemon.spriteDefault}
            alt={pokemon.name}
            fill
            sizes="96px"
            className="object-contain pixelated"
            unoptimized
          />
        ) : (
          <div className="w-full h-full rounded-md bg-secondary flex items-center justify-center text-muted-foreground text-xs">
            ?
          </div>
        )}
      </div>

      {dexNumber && (
        <span className="text-[10px] font-mono text-muted-foreground mt-1">{dexNumber}</span>
      )}

      <h3 className="text-xs font-semibold text-center mt-0.5 group-hover:text-red-400 transition-colors leading-tight">
        {pokemon.name}
      </h3>

      <div className="flex gap-1 mt-1.5 flex-wrap justify-center">
        <TypeBadge type={pokemon.typeOne} />
        {pokemon.typeTwo && <TypeBadge type={pokemon.typeTwo} />}
      </div>

      {(pokemon.isLegendary || pokemon.isMythical) && (
        <span className="text-[9px] mt-1 px-1.5 py-0.5 rounded-full bg-yellow-500/20 text-yellow-400 border border-yellow-500/30">
          {pokemon.isMythical ? 'Mythical' : 'Legendary'}
        </span>
      )}
    </Link>
  );
}
