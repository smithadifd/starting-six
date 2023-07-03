import { useState, useEffect } from "react";
import { useAppSelector } from "app/hooks";
import { VirtuosoGrid } from "react-virtuoso";

import { useGetPokemonListQuery } from "services/api";

import { Pokemon } from "lib/types";

import Filter from "components/ui/Filter";
import PkCard from "components/pokemon/PokemonCard";
import PokemonDetailsModal from "components/pokemon/PokemonDetailsModal";

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
 * Consists of a list of PokemonCard components, which is a list of a Pokemon's name, number, and sprite.
 */
const PokemonGrid = () => {
  const { data } = useGetPokemonListQuery();
  const chosenPokemon = useAppSelector((state) => state.pokemon.chosenPokemon);

  const [pokemonList, setPokemonList] = useState<Pokemon[]>([]);
  const [selectedPokemonName, setSelectedPokemonName] = useState<String | null>(null);
  const [filter, setFilter] = useState<string>("");

  const filterHandler = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFilter(e.target.value);
  };
  const onPokemonClick = (pokemonName: String) => {
    setSelectedPokemonName(pokemonName);
  };
  const onClose = () => {
    setSelectedPokemonName(null);
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
            onClick: () => onPokemonClick(p.name),
          });
        }}
        style={{ height: "calc(100vh - 156px)" }}
        listClassName="flex flex-wrap justify-center"
      />
      <PokemonDetailsModal name={selectedPokemonName} isOpen={Boolean(selectedPokemonName)} onClose={onClose} />
    </div>
  );
}

export default PokemonGrid;
