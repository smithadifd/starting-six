import { useAppSelector } from "hooks/app";

import Tabs from "components/ui/Tabs";
import Card from "components/ui/Card";
import PokemonDetailsCard from "components/pokemon/PokemonDetailsCard";

const Team = () => {
  const chosenPokemon = useAppSelector((state) => state.pokemon.chosenPokemon);

  return (
    <Card className="mx-4 flex flex-col p-4 backdrop-blur bg-opacity-50">
      <Tabs>
        <div title="Team" className="flex flex-wrap">
          {Object.keys(chosenPokemon).map((pokemonName) => (
            <PokemonDetailsCard
              key={pokemonName}
              pokemon={chosenPokemon[pokemonName]}
              className="m-2"
            />
          ))}
        </div>
        <div title="Details">Details here</div>
      </Tabs>
    </Card>
  );
};

export default Team;
