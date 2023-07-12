import { useAppSelector } from "hooks/app";
import { Pokemon as PokemonType } from "lib/types";
import { getClassNames } from "lib/utils";

import Tabs from "components/ui/Tabs";
import TypeEffectivenessContainer from "components/pokemon/TypeEffectivenessContainer";
import Moves from "components/pokemon/Moves";
import TeamStats from "components/pokemon/TeamStats";

interface PokemonDetailsTabsProps {
  pokemon: PokemonType;
  showNormal?: boolean;
}

const PokemonDetailsTabs = ({
  pokemon,
  showNormal,
}: PokemonDetailsTabsProps) => {
  const chosenPokemon = useAppSelector((state) => state.pokemon.chosenPokemon);
  // const hasPokemon = Object.keys(chosenPokemon).length > 0;
  const tabHeaders = ["Effectiveness", "Moves", "Team Stats"];

  return (
    <Tabs>
      {tabHeaders.map((header) => {
        if (header === "Effectiveness") {
          return (
            <div key={header} title={header}>
              <TypeEffectivenessContainer
                pokemon={pokemon}
                showNormal={showNormal}
              />
            </div>
          );
        } else if (header === "Moves") {
          return (
            <div key={header} title={header}>
              <Moves moves={pokemon.moves} />
            </div>
          );
        } else if (header === "Team Stats") {
          return (
            <div key={header} title={header}>
              <TeamStats pokemon={pokemon} />
            </div>
          );
        }
      })}
    </Tabs>
  );
};

export default PokemonDetailsTabs;
