import { useNavigate } from "react-router-dom";
import { useContext } from "react";

import { useAppSelector } from "hooks/app";
import { PokemonDetailsContext } from "lib/contexts";

import Sprite from "components/pokemon/Sprite";

interface SpriteButtonProps {
  pokemonName: string;
}

const SpriteButton = ({ pokemonName }: SpriteButtonProps) => {
  const navigate = useNavigate();
  const onPokemonClick = useContext(PokemonDetailsContext);

  const chosenPokemon = useAppSelector((state) => state.pokemon.chosenPokemon)[
    pokemonName
  ];

  return (
    <button
      className="flex h-20 w-20 items-center justify-center border-solid"
      type="button"
      disabled={!pokemonName}
      onClick={() => onPokemonClick(pokemonName)}
    >
      <Sprite number={chosenPokemon?.id} alt={chosenPokemon?.name} />
    </button>
  );
}

export default SpriteButton;
