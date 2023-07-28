import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faArrowRight } from "@fortawesome/free-solid-svg-icons";

import { Pokemon as PokemonType } from "lib/types";

import Sprite from "components/pokemon/Sprite";
import Type from "components/pokemon/Type";

interface MemberEffectivenessProps {
  offensivePokemon?: PokemonType;
  defensivePokemon?: PokemonType | PokemonType[];
  types: Map<string, number>;
  // types: Array<[string, number]>;
  effectiveness?: number;
}

function MemberEffectiveness({
  offensivePokemon,
  defensivePokemon,
  types,
  effectiveness,
}: MemberEffectivenessProps) {
  console.log(
    "offensivePokemon",
    offensivePokemon,
    "defensivePokemon",
    defensivePokemon,
    "types",
    types
  );
  const offense =
    offensivePokemon && !Array.isArray(offensivePokemon)
      ? [offensivePokemon]
      : offensivePokemon;
  const defense =
    defensivePokemon && !Array.isArray(defensivePokemon)
      ? [defensivePokemon]
      : defensivePokemon;
  const pkTypes = types && !Array.isArray(types) ? [types] : types;

  return (
    <div className="flex flex-row items-center">
      {offense.length &&
        offense.map((pokemon) => (
          <Sprite key={pokemon.name} number={pokemon.id} alt={pokemon.name} />
        ))}
      {offense && <FontAwesomeIcon icon={faArrowRight} />}
      {/* <div className="mx-2 flex flex-col items-center justify-center">
        {pkTypes.map((type) => (
          <Type
            key={type}
            type={type}
            effectiveness={effectiveness}
            className="my-1"
          />
        ))}
      </div> */}
      <div className="mx-2 flex flex-col items-center justify-center">
        {Array.from(types.entries()).map(([type, eff]) => (
          <Type key={type} type={type} effectiveness={eff} className="my-1" />
        ))}
      </div>
      {defense.length && <FontAwesomeIcon icon={faArrowRight} />}
      {defense.length &&
        defense.map((pokemon) => (
          <Sprite key={pokemon.name} number={pokemon.id} alt={pokemon.name} />
        ))}
    </div>
  );
}

export default MemberEffectiveness;
