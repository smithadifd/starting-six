import { useAppSelector } from "hooks/app";

interface SelectPokemonButtonProps {
  name: string;
  onClickHandler: ({ isAdding }: { isAdding: boolean }) => () => void;
}

const SelectPokemonButton = ({ name, onClickHandler } : SelectPokemonButtonProps) => {
  const chosenPokemon = useAppSelector((state) => state.pokemon.chosenPokemon);

  const pokemonNames = Object.keys(chosenPokemon);
  const fullTeam = pokemonNames.length === 6;

  console.log('chosenPokemon', chosenPokemon, 'pokemonNames', pokemonNames, 'fullTeam', fullTeam);

  const canAdd = !chosenPokemon[name];
  const text = canAdd ? "Add" : "Remove";
  const isDisabled = canAdd && fullTeam;
  let color = canAdd ? "blue" : "red";
  if (isDisabled) color = "gray"; // TODO: Not pulling from config
  const classes = `btn btn-${color}`;

  return (
    // disabled={isDisabled}
    <button
      className={classes}
      type="button"
      onClick={() => onClickHandler({ isAdding: canAdd })}
    >
      {text}
    </button>
  );
}

export default SelectPokemonButton;
