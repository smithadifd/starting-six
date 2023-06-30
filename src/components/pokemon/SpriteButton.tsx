import { useAppSelector } from "app/hooks";
import { useNavigate } from "react-router-dom";

import Sprite from "components/pokemon/Sprite";

interface SpriteButtonProps {
  pokemonName: string;
}

function SpriteButton({ pokemonName }: SpriteButtonProps) {
  const navigate = useNavigate();

  const chosenPokemon = useAppSelector((state) => state.pokemon.chosenPokemon)[
    pokemonName
  ];
  const onClickHandler = () => {
    if (pokemonName) {
      navigate(`../${pokemonName}`);
    }
  };

  return (
    <button
      className="flex h-20 w-20 items-center justify-center border-solid"
      type="button"
      disabled={!pokemonName}
      onClick={onClickHandler}
    >
      <Sprite number={chosenPokemon?.id} alt={chosenPokemon?.name} />
    </button>
  );
}

export default SpriteButton;
