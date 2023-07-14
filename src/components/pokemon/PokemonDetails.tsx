import PokemonHeader from "components/pokemon/PokemonHeader";
import Sprite from "components/pokemon/Sprite";
import Stats from "components/pokemon/Stats";
import Abilities from "components/pokemon/Abilities";
import PokemonDetailsTabs from "components/pokemon/PokemonDetailsTabs";

interface PokemonDetailsProps {
  pokemon: any;
  showAdditionalDetails?: boolean;
  children?: React.ReactNode;
}

/**
 * Modal overlay that shows details about the Pokemon the user selected.
 */
const PokemonDetails = ({
  pokemon,
  showAdditionalDetails = true,
  children,
}: PokemonDetailsProps) => {
  return (
    <div>
      <PokemonHeader pokemon={pokemon} />
      <div className="mx-auto flex h-full flex-col px-4">
        <div className="flex">
          <div className="flex w-1/4 flex-col place-items-center">
            <Sprite number={pokemon.id} alt={pokemon.name} />
            <Abilities abilities={pokemon.abilities} />
          </div>
          <Stats stats={pokemon.stats} />
        </div>
        {showAdditionalDetails && (
          <div className="h-96 overflow-auto pt-4">
            <PokemonDetailsTabs pokemon={pokemon} />
          </div>
        )}
      </div>
      {children}
    </div>
  );
};

export default PokemonDetails;
