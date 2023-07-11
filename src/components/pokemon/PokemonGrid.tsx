import { useState, useEffect, useContext } from "react";
import { useAppSelector } from "hooks/app";
import { VirtuosoGrid } from "react-virtuoso";

import { useGetPokemonListQuery } from "services/api";
import { PokemonDetailsContext } from "lib/contexts";
import { Pokemon } from "lib/types";

import Card from "components/ui/Card";
import Filter from "components/ui/Filter";
import PkCard from "components/pokemon/PokemonCard";

interface PokemonCardProps {
  pokemon: Pokemon;
  isSelected?: boolean;
  filter?: string;
  onClick?: () => void;
}

const PokemonCard = ({ pokemon, isSelected = false, filter, onClick } : PokemonCardProps) => {
  return <PkCard pokemon={pokemon} isSelected={isSelected} filter={filter} onClick={onClick} />;
}

/**
 * Consists of a grid of PokemonCard components, which renders a Pokemon's name, number, and sprite.
 */
const PokemonGrid = () => {
  const { data } = useGetPokemonListQuery();
  const onPokemonClick = useContext(PokemonDetailsContext);
  const chosenPokemon = useAppSelector((state) => state.pokemon.chosenPokemon);

  const [pokemonList, setPokemonList] = useState<Pokemon[]>([]);
  const [filter, setFilter] = useState<string>("");

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
    // <Card className="flex flex-col mx-4 backdrop-blur backdrop-opacity-10" color="white/30">
    <Card className="flex flex-col mx-4 backdrop-blur backdrop-opacity-50">
      <div className="flex justify-center rounded p-4">
        <Filter filter={filter} handler={filterHandler} className="shadow" />
      </div>
      <VirtuosoGrid
        data={pokemonList}
        itemContent={(index, p) => {
          return PokemonCard({
            pokemon: p,
            isSelected: Boolean(chosenPokemon && chosenPokemon[p.name]),
            filter,
            onClick: () => onPokemonClick(p.name),
          });
        }}
        style={{ height: "calc(100vh - 156px)" }}
        listClassName="flex flex-wrap justify-center"
      />
    </Card>
  );
}

export default PokemonGrid;
