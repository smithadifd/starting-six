import { useAppSelector } from "hooks/app";

interface SelectPokemonButtonProps {
  name: string;
  onClickHandler: ({ isAdding }: { isAdding: boolean }) => void;
}

const SelectPokemonButton = ({
  name,
  onClickHandler,
}: SelectPokemonButtonProps) => {
  const chosenPokemon = useAppSelector((state) => state.pokemon.chosenPokemon);
  const pokemonNames = Object.keys(chosenPokemon);
  const fullTeam = pokemonNames.length >= 6;

  const canAdd = !chosenPokemon[name];
  const text = canAdd ? "Add" : "Remove";
  const isDisabled = canAdd && fullTeam;
  const commonClasses = "p-2 px-4 ml-2 rounded text-white font-medium";

  // NOTE: Originally was built dynamically, but Tailwind hover classes wouldn't apply.
  if (isDisabled) {
    return (
      <button
        className={`${commonClasses} bg-gray-500 hover:bg-gray-500`}
        type="button"
        disabled={isDisabled}
      >
        {text}
      </button>
    );
  } else if (canAdd) {
    return (
      <button
        className={`${commonClasses} bg-sky-500 hover:bg-sky-600`}
        type="button"
        disabled={isDisabled}
        onClick={() => onClickHandler({ isAdding: canAdd })}
      >
        {text}
      </button>
    );
  } else {
    return (
      <button
        className={`${commonClasses} bg-red-500 hover:bg-red-600`}
        type="button"
        disabled={isDisabled}
        onClick={() => onClickHandler({ isAdding: canAdd })}
      >
        {text}
      </button>
    );
  }
};

export default SelectPokemonButton;
