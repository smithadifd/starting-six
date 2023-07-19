import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faArrowRight } from "@fortawesome/free-solid-svg-icons";

import { Pokemon, Pokemon as PokemonType } from "lib/types";

import Sprite from "components/pokemon/Sprite";
import Type from "components/pokemon/Type";

interface MemberEffectivenessProps {
  offensivePokemon: PokemonType;
  defensivePokemon: PokemonType | PokemonType[];
  types: Map<string, number>;
}

function MemberEffectiveness({
  offensivePokemon,
  defensivePokemon,
  types,
}: MemberEffectivenessProps) {
  let defense = defensivePokemon;
  if (!Array.isArray(defense)) defense = [defense];

  return (
    <div className="flex flex-row items-center">
      {offensivePokemon && (
        <Sprite number={offensivePokemon.id} alt={offensivePokemon.name} />
      )}
      {offensivePokemon && <FontAwesomeIcon icon={faArrowRight} />}
      <div className="mx-2 flex flex-col items-center justify-center">
        {Array.from(types.entries()).map(([type, eff]) => (
          <Type key={type} type={type} effectiveness={eff} className="my-1" />
        ))}
      </div>
      {defensivePokemon && <FontAwesomeIcon icon={faArrowRight} />}
      {defensivePokemon &&
        // <Sprite number={defensivePokemon.id} alt={defensivePokemon.name} />
        defense.map((pokemon) => (
          <Sprite key={pokemon.id} number={pokemon.id} alt={pokemon.name} />
        ))}
    </div>
  );
}

export default TeamMemberEffectiveness;
