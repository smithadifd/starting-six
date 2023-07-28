import { useState } from "react";

import { useAppSelector } from "hooks/app";
import { useEffectiveness } from "hooks/pokemon";
import { Pokemon as PokemonType } from "lib/types";

// import TeamEffectiveness from "components/team/TeamEffectiveness";

interface TeamStatsProps {
  pokemon: PokemonType;
}

function TeamStats({ pokemon }: TeamStatsProps) {
  const pokemonActions = useEffectiveness(pokemon);
  const chosenPokemon = useAppSelector((state) => state.pokemon.chosenPokemon);
  const [stats] = useState(() => {
    const attackWith = new Map();
    const avoidUsing = new Map();

    Object.entries(chosenPokemon).forEach(
      ([teamMemberName, teamMemberData]) => {
        const [type1, type2] = teamMemberData.types;
        const { defense } = pokemonActions;

        for (const memberType of [type1, type2]) {
          if (!memberType) continue; // Exit early for Pokemon without a second type

          const { name: typeName } = memberType.type;
          const effectiveness = defense[typeName]; // Otherwise opponent's defense against team member's type
          if (effectiveness > 1) {
            if (!attackWith.has(teamMemberName)) {
              attackWith.set(teamMemberName, new Map());
            }
            attackWith.get(teamMemberName).set(typeName, effectiveness);
          } else if (effectiveness < 1) {
            if (!avoidUsing.has(teamMemberName)) {
              avoidUsing.set(teamMemberName, new Map());
            }
            avoidUsing.get(teamMemberName).set(typeName, effectiveness);
          }
        }
      }
    );

    return { attackWith, avoidUsing };
  });

  console.log("stats", stats);

  return (
    <div className="flex justify-center">
      <span>TBD</span>
      {/* <div className="flex flex-col">
        <h2 className="text-2xl font-bold">Effective Against</h2>
        <TeamEffectiveness
          effectiveness={stats.attackWith}
          opponent={pokemon}
        />
      </div>
      <div className="flex flex-col">
        <h2 className="text-2xl font-bold">Resistant/Immune To</h2>
        <TeamEffectiveness
          effectiveness={stats.avoidUsing}
          opponent={pokemon}
        />
      </div> */}
    </div>
  );
}

export default TeamStats;
