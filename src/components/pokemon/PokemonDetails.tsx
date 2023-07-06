import PokemonHeader from "components/pokemon/PokemonHeader";
import Sprite from "components/pokemon/Sprite";
import Stats from "components/pokemon/Stats";
import Abilities from "components/pokemon/Abilities";
// import TypeEffectivenessContainer from "components/common/TypeEffectivenessContainer.js";
// import PokemonDetailsTabs from "components/common/PokemonDetailsTabs";

interface PokemonDetailsProps {
  pokemon: any;
  className?: string[];
  showAdditionalDetails?: boolean;
  showNormal?: boolean;
  children?: React.ReactNode;
}

/**
 * Modal overlay that shows details about the Pokemon the user selected.
 */
function PokemonDetails({
  pokemon,
  className = [],
  showAdditionalDetails = true,
  showNormal = false,
  children,
} : PokemonDetailsProps) {
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
        {/* {showAdditionalDetails ? (
          <PokemonDetailsTabs
            pokemon={pokemon}
            className="mx-2"
            showNormal={showNormal}
          />
        ) : (
          <TypeEffectivenessContainer
            pokemon={pokemon}
            className="mb-2 max-h-80 overflow-auto"
            showNormal={showNormal}
          />
        )} */}
      </div>
      {children}
    </div>
  );
}

export default PokemonDetails;
