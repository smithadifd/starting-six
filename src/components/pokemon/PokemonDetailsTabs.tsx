// import { useAppSelector } from "hooks/app";
import { Pokemon as PokemonType } from "lib/types";

import Tabs from "components/ui/Tabs";
import TypeEffectivenessContainer from "components/pokemon/TypeEffectivenessContainer";
import Moves from "components/pokemon/Moves";
import TeamStats from "components/pokemon/TeamStats";

interface PokemonDetailsTabsProps {
  pokemon: PokemonType;
}

function PokemonDetailsTabs({ pokemon }: PokemonDetailsTabsProps) {
  // const chosenPokemon = useAppSelector((state) => state.pokemon.chosenPokemon);
  // const hasPokemon = Object.keys(chosenPokemon).length > 0;
  const tabHeaders = ["Effectiveness", "Moves", "Team Stats"];

  return (
    <Tabs>
      {tabHeaders.map((header) => {
        return (
          <div key={header} title={header}>
            {header === "Effectiveness" && (
              <TypeEffectivenessContainer pokemon={pokemon} />
            )}
            {header === "Moves" && <Moves moves={pokemon.moves} />}
            {header === "Team Stats" && <TeamStats pokemon={pokemon} />}
          </div>
        );
      })}
    </Tabs>
  );
}

export default PokemonDetailsTabs;
