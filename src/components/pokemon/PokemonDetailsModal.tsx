import { useState, useEffect } from "react";

import { useGetPokemonByNameQuery } from "services/api";
import { Pokemon as PokemonType } from "lib/types";

import Modal from 'components/ui/Modal';
import PokemonDetails from "components/pokemon/PokemonDetails";

interface PokemonDetailsModalProps {
  name: string;
  isOpen: boolean;
  onClose: () => void;
}

/**
 * TODO: Convert original component over to be TypeScript and prop driven.
 */
const PokemonDetailsModal = ({ name, isOpen, onClose} : PokemonDetailsModalProps) => {
  const { data } = useGetPokemonByNameQuery(name);

  const [pokemon, setPokemon] = useState<PokemonType | null>(null);

  useEffect(() => {
    if (data) {
      setPokemon(data);
    }
  }, [data]);

  console.log('data', data);
  return (
    pokemon && (
      <Modal isOpen={isOpen} onClose={onClose}>
        <PokemonDetails pokemon={pokemon} />
        {/* <div className="flex flex-col">
          <div className="flex flex-row justify-between">
            <div className="flex flex-col">
              <h1 className="text-4xl font-bold">Pokemon Name</h1>
              <h2 className="text-2xl font-bold">Pokemon Number</h2>
            </div>
            <div className="flex flex-col">
              <span>Data here</span>
            </div>
          </div>
        </div> */}
      </Modal>
    )
  )
}

export default PokemonDetailsModal;