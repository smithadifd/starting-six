import { useState, useEffect } from "react";
import { useAppSelector } from "app/hooks";
import { VirtuosoGrid } from "react-virtuoso";

import { useGetPokemonListQuery } from "services/api";

import { Pokemon } from "lib/types";

import Filter from "components/ui/Filter";
import PkCard from "components/pokemon/PokemonCard";

interface PokemonCardProps {
  pokemon: Pokemon;
  isSelected?: boolean;
  filter?: string;
}

const PokemonCard = ({ pokemon, isSelected = false, filter } : PokemonCardProps) => {
  return <PkCard pokemon={pokemon} isSelected={isSelected} filter={filter} />;
}

/**
 * Consists of a list of PokemonCard components, which is a list of a Pokemon's name, number, and sprite.
 */
// function PokemonGrid({ pokemon } : PokemonGridProps) {
const PokemonGrid = () => {
  const { data } = useGetPokemonListQuery();
  // const [pokemonList, setPokemonList] = useState<Pokemon[]>([]);
  const [pokemonList, setPokemonList] = useState<Pokemon[]>([]);
  const [filter, setFilter] = useState<string>("");
  const chosenPokemon = useAppSelector((state) => state.pokemon.chosenPokemon);

  // TODO: Lookup filter logic, make into handler, then run on useEffect
  const filterHandler = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFilter(e.target.value);
  };


  useEffect(() => {
    const pokemon = data?.results || [];
    const filteredPokemon = pokemon.filter((p) => {
      return p.name.toLowerCase().includes(filter.toLowerCase());
    });
    setPokemonList(filteredPokemon);
  }, [data, filter]);
  return (
    <div className="flex flex-col">
      <Filter filter={filter} handler={filterHandler} />
      <VirtuosoGrid
        data={pokemonList}
        itemContent={(index, p) => {
          return PokemonCard({
            pokemon: p,
            isSelected: Boolean(chosenPokemon && chosenPokemon[p.name]),
            filter,
          });
        }}
        style={{ height: "calc(100vh - 115px)" }}
        listClassName="flex flex-wrap justify-center"
      />
    </div>
  );
}

export default PokemonGrid;
