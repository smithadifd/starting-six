import { useAppSelector } from "hooks/app";

import Tabs from "components/ui/Tabs";
import Card from "components/ui/Card";
import PokemonDetailsCard from "components/pokemon/PokemonDetailsCard";

const Team = () => {
  const chosenPokemon = useAppSelector((state) => state.pokemon.chosenPokemon);

  return (
    <Card className="m-4 flex h-full flex-col overflow-auto bg-opacity-50 p-4 backdrop-blur">
      <Tabs>
        <div title="Team" className="mt-4 flex flex-wrap justify-center">
          {Object.keys(chosenPokemon).map((pokemonName) => (
            <PokemonDetailsCard
              key={pokemonName}
              pokemon={chosenPokemon[pokemonName]}
              className="m-2 w-80"
              showAdditionalDetails={false}
            />
          ))}
        </div>
        <div title="Details">Details here</div>
      </Tabs>
    </Card>
  );
};

export default Team;
