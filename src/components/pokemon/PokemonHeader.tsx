import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faStar } from "@fortawesome/free-solid-svg-icons";

import { getNumberFromUrl } from "lib/utils";
import { Pokemon } from "lib/types";

import Types from "components/pokemon/Types";

interface PokemonHeaderProps {
  pokemon: Pokemon;
  isSelected?: boolean;
  filter?: string;
}

function PokemonHeader({
  pokemon,
  isSelected = false,
  filter,
}: PokemonHeaderProps) {
  const bgColor = isSelected ? "bg-amber-300" : "bg-sky-500";
  const textColor = isSelected ? "text-neutral-900" : "text-neutral-50";
  const classNames = `flex justify-between items-center rounded-t p-4 ${bgColor}`;

  const number = pokemon.id || getNumberFromUrl(pokemon.url);
  const withPadding = (n: number) => n.toString().padStart(3, "0");

  const text = `#${number && withPadding(number)} ${pokemon.name}`;
  let title = (
    <h3 className={`prose prose-lg capitalize ${textColor}`}>{text}</h3>
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
      // FIX: Highlighting is acting a bit wonky.
      title = (
        <>
          {before}
          <span className="bg-yellow-300">{match}</span>
          {after}
        </>
      );
    }
  }

  return (
    <div className={classNames}>
      <div className="flex w-full items-center justify-between">
        {title}
        {pokemon.types && <Types types={pokemon.types} />}
        {isSelected && (
          <FontAwesomeIcon icon={faStar} className="text-yellow-500" />
        )}
      </div>
    </div>
  );
}

export default PokemonHeader;
