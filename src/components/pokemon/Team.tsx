import { useAppSelector } from "app/hooks";

import PokemonDetailsCard from "components/pokemon/PokemonDetailsCard";

const Team = () => {
  const chosenPokemon = useAppSelector((state) => state.pokemon.chosenPokemon);
  
  return (
    <div className="flex flex-wrap justify-center">
      {Object.keys(chosenPokemon).map((name) => (
        <PokemonDetailsCard key={name} pokemon={chosenPokemon[name]} />
      ))}
    </div>
  )
};

export default Team;