import { useState, useEffect } from "react";

import { useGetPokemonByNameQuery } from "services/api";
import { Pokemon as PokemonType } from "lib/types";
import { useAppDispatch } from "hooks/app";

import Modal from "components/ui/Modal";
import PokemonDetails from "components/pokemon/PokemonDetails";
import SelectPokemonButton from "components/pokemon/SelectPokemonButton";

interface PokemonDetailsModalProps {
  name: string;
  isOpen: boolean;
  onClose: () => void;
}

function PokemonDetailsModal({
  name,
  isOpen,
  onClose,
}: PokemonDetailsModalProps) {
  const dispatch = useAppDispatch();
  const { data } = useGetPokemonByNameQuery(name);
  const [pokemon, setPokemon] = useState<PokemonType | null>(null);

  const onClickHandler = ({ isAdding }: { isAdding: boolean }) => {
    const action = isAdding ? "pokemon/addPokemon" : "pokemon/removePokemon";
    dispatch({ type: action, payload: pokemon });
    onClose();
  };

  useEffect(() => {
    if (data) {
      setPokemon(data);
    }
  }, [data]);

  return (
    pokemon && (
      <Modal isOpen={isOpen} onClose={onClose}>
        <PokemonDetails pokemon={pokemon}>
          <div className="flex justify-end p-4 align-middle">
            <button
              className="mr-2 rounded px-4 py-2 font-medium hover:bg-neutral-200"
              type="button"
              onClick={onClose}
            >
              Close
            </button>
            <SelectPokemonButton name={name} onClickHandler={onClickHandler} />
          </div>
        </PokemonDetails>
      </Modal>
    )
  );
}

export default PokemonDetailsModal;
