import { getNumberFromUrl, getClassNames } from "lib/utils";
import { Pokemon } from "lib/types";

import Card from "components/ui/Card";
import Sprite from "components/pokemon/Sprite";
import PokemonHeader from "components/pokemon/PokemonHeader";

interface PokemonCardProps {
  pokemon: Pokemon;
  isSelected?: boolean;
  className?: string;
  filter?: string;
  onClick?: () => void;
}

const PokemonCard = ({
  pokemon,
  isSelected = false,
  className = "",
  filter,
  onClick,
}: PokemonCardProps) => {
  const classes = getClassNames(
    "m-2 flex flex-col rounded border border-neutral-300 w-52 h-52 bg-neutral-50",
    className
  );

  return (
    <button onClick={onClick}>
      <Card className={classes}>
        <PokemonHeader
          pokemon={pokemon}
          className="flex grow"
          isSelected={isSelected}
          filter={filter}
        />

        <div className="flex h-full items-center justify-center bg-zinc-50">
          <Sprite
            number={getNumberFromUrl(pokemon.url)}
            alt={pokemon.name}
            className={["w-1/2"]}
          />
        </div>
      </Card>
    </button>
  );
};

export default PokemonCard;
