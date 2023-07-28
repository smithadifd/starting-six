import { useAppSelector } from "hooks/app";

import { useGetPokemonByNameQuery } from "services/api";
import { Pokemon as PokemonType } from "lib/types";

import MemberEffectiveness from "components/team/MemberEffectiveness";

interface TeamEffectivnessProps {
  effectiveness?: Map<string, Map<string, number>>;
  opponent?: PokemonType;
}

function TeamEffectiveness({
  effectiveness = new Map(),
  opponent = {} as PokemonType,
}: TeamEffectivnessProps) {
  const { data: opponentData } = useGetPokemonByNameQuery(opponent.name);
  const chosenPokemon = useAppSelector((state) => state.pokemon.chosenPokemon);

  if (!effectiveness.size || Object.keys(chosenPokemon).length === 0) {
    return <div className="flex flex-col">N/A</div>;
  }

  return (
    <div className="flex flex-col">
      {Array.from(effectiveness.entries()).map(([name, typeCollection]) => {
        console.log("name", name, "typeCollection", typeCollection);
        return (
          <MemberEffectiveness
            key={name}
            offensivePokemon={chosenPokemon[name]}
            defensivePokemon={opponentData}
            types={typeCollection}
          />
        );
      })}
    </div>
  );
}

export default TeamEffectiveness;
