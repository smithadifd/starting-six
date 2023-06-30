import { useState, useEffect } from "react";
import { useAppSelector } from "app/hooks";
import { VirtuosoGrid } from "react-virtuoso";

import { useGetPokemonListQuery } from "services/api";

import { Pokemon } from "lib/types";

// import Filter from "components/ui/Filter";
import PkCard from "components/pokemon/PokemonCard";

interface PokemonCardProps {
  pokemon: Pokemon;
  isSelected?: boolean;
}

const PokemonCard = ({ pokemon, isSelected = false } : PokemonCardProps) => {
  return <PkCard pokemon={pokemon} isSelected={isSelected} />;
}

/**
 * Consists of a list of PokemonCard components, which is a list of a Pokemon's name, number, and sprite.
 */
// function PokemonGrid({ pokemon } : PokemonGridProps) {
const PokemonGrid = () => {
  const { data } = useGetPokemonListQuery();
  // const [pokemonList, setPokemonList] = useState<Pokemon[]>([]);
  const [pokemonList, setPokemonList] = useState<Pokemon[]>([]);
  const chosenPokemon = useAppSelector((state) => state.pokemon.chosenPokemon);

  // TODO: Lookup filter logic, make into handler, then run on useEffect

  useEffect(() => {
    setPokemonList(data?.results || []);
  }, [data]);
  return (
    <div className="flex flex-col">
      {/* <Filter /> */}
      <VirtuosoGrid
        data={pokemonList}
        itemContent={(index, p) => {
          return PokemonCard({
            pokemon: p,
            isSelected: Boolean(chosenPokemon && chosenPokemon[p.name]),
          });
        }}
        style={{ height: "calc(100vh - 115px)" }}
        listClassName="flex flex-wrap justify-center"
      />
    </div>
  );
}

export default PokemonGrid;
