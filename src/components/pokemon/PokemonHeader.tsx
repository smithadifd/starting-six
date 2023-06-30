import { useAppSelector } from "app/hooks";

import { getNumberFromUrl } from "lib/utils";
import { Pokemon } from "lib/types";

import Types from "components/pokemon/Types";

interface PokemonHeaderProps {
  pokemon: Pokemon;
  isSelected?: boolean;
  className?: string;
  filter?: string;
}

function PokemonHeader({ pokemon, isSelected = false, filter } : PokemonHeaderProps) {
  const number = pokemon.id || getNumberFromUrl(pokemon.url);
  const withPadding = (n:number) => n.toString().padStart(3, "0");
  const text = `#${number && withPadding(number)} ${pokemon.name}`;
  let title = (
    <h3 className="prose prose-lg capitalize">{text}</h3>
  );

  // If a filter is present, highlight the text around the match.
  if (filter) {
    const lowecaseFilter = filter.toLowerCase();
    const index = text.toLowerCase().indexOf(lowecaseFilter);
    if (index !== -1) {
      const length = filter.length;
      const before = text.slice(0, index);
      const match = text.slice(index, index + length);
      const after = text.slice(index + length);
      title = (
        <>
          {before}
          <span className="bg-yellow-300">{match}</span>
          {after}
        </>
      );
    }
  }

  const bgColor = isSelected ? "bg-amber-300" : "bg-slate-300";
  const classNames = `flex justify-between items-center rounded-t p-4 ${bgColor}`;

  return (
    <div className={classNames}>
      <div className="flex items-center">
        {title}
        {pokemon.types && <Types types={pokemon.types} />}
      </div>
    </div>
  );
}

export default PokemonHeader;
