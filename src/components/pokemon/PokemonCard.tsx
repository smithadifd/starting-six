import { useNavigate } from "react-router-dom";
// import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
// import { faStar } from "@fortawesome/free-solid-svg-icons";

import { getNumberFromUrl, getClassNames } from "lib/utils";
import { Pokemon } from "lib/types";

import Sprite from "components/pokemon/Sprite";
import PokemonHeader from "components/pokemon/PokemonHeader";

interface PokemonCardProps {
  pokemon: Pokemon;
  isSelected?: boolean;
  className?: string;
  filter?: string;
}

function PokemonCard({ pokemon, isSelected = false, className = "", filter } : PokemonCardProps) {
  const navigate = useNavigate();
  const onClickHandler = () => navigate(`../${pokemon.name}`);
  const classes = getClassNames(
    "m-2 flex flex-col rounded border border-slate-300 w-52 h-52 bg-white",
    className
  );

  return (
    // eslint-disable-next-line jsx-a11y/no-static-element-interactions, jsx-a11y/click-events-have-key-events
    <div className={classes} onClick={onClickHandler}>
      <PokemonHeader
        pokemon={pokemon}
        className="flex grow"
        isSelected={isSelected}
        filter={filter}
      />
        {/* {isSelected && (
          <FontAwesomeIcon icon={faStar} className="text-yellow-500" />
        )} */}
      {/* </PokemonHeader> */}
      <div className="flex h-full items-center justify-center bg-zinc-50">
        <Sprite
          number={getNumberFromUrl(pokemon.url)}
          alt={pokemon.name}
          className={["w-1/2"]}
        />
      </div>
    </div>
  );
}

export default PokemonCard;
