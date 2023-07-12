import { getClassNames } from "lib/utils";

import SpriteButton from "components/pokemon/SpriteButton";

interface PokemonTeamProps {
  pokemonNames: string[];
  className?: string;
}

/**
 * Sprites containing up-to 6 selected Pokemon with an action to navigate to a details page
 * showcasing details about the Pokemon the user selected.
 */
const PokemonTeam = ({
  pokemonNames = [],
  className = "",
}: PokemonTeamProps) => {
  const classes = getClassNames(
    "flex rounded border border-black bg-neutral-50",
    className
  );
  return (
    <div className={classes}>
      {Array.from({ length: 6 }, (v, k) => k).map((i) => {
        const pokemonName = pokemonNames[i];
        return <SpriteButton key={i} pokemonName={pokemonName} />;
      })}
    </div>
  );
};

export default PokemonTeam;
