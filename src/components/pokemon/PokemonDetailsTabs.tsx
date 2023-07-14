// import { useAppSelector } from "hooks/app";
import { Pokemon as PokemonType } from "lib/types";

import Tabs from "components/ui/Tabs";
import TypeEffectivenessContainer from "components/pokemon/TypeEffectivenessContainer";
import Moves from "components/pokemon/Moves";
import TeamStats from "components/pokemon/TeamStats";

interface PokemonDetailsTabsProps {
  pokemon: PokemonType;
}

const PokemonDetailsTabs = ({ pokemon }: PokemonDetailsTabsProps) => {
  // const chosenPokemon = useAppSelector((state) => state.pokemon.chosenPokemon);
  // const hasPokemon = Object.keys(chosenPokemon).length > 0;
  const tabHeaders = ["Effectiveness", "Moves", "Team Stats"];

  return (
    <Tabs>
      {tabHeaders.map((header) => {
        if (header === "Effectiveness") {
          return (
            <div key={header} title={header}>
              <TypeEffectivenessContainer pokemon={pokemon} />
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
