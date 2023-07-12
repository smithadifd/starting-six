import { useNavigate } from "react-router-dom";
import { useAppSelector } from "hooks/app";
// import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
// import { faPeopleGroup } from "@fortawesome/free-solid-svg-icons";

import TeamOverview from "components/team/TeamOverview";

/**
 * Persistant header showing application name as well as pokeballs representing the 6 selected Pokemon.
 */
const Header = () => {
  const navigate = useNavigate();

  const onClickHandler = () => navigate("/");
  const viewTeamHandler = () => navigate("/team");

  const chosenPokemon = useAppSelector((state) => state.pokemon.chosenPokemon);
  const pokemonNames = Object.keys(chosenPokemon);

  return (
    <header className="flex place-items-center justify-between bg-red-700 px-4 shadow-lg max-[750px]:flex-wrap">
      {/* eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-noninteractive-element-interactions  */}
      <h1
        className="title cursor-pointer text-white max-lg:text-xl"
        onClick={onClickHandler}
      >
        Starting Six
      </h1>
      <TeamOverview
        pokemonNames={pokemonNames}
        className="my-4 max-[750px]:hidden"
      />
      <button
        disabled={pokemonNames.length === 0}
        type="button"
        className="prose-lg rounded-md border-2 border-white p-2"
        onClick={viewTeamHandler}
      >
        <span className="mr-2 text-white max-lg:hidden">View Team</span>
        {/* <FontAwesomeIcon icon={faPeopleGroup} className="text-white" /> */}
      </button>
      <div className="hidden w-full justify-center max-[750px]:flex">
        <TeamOverview pokemonNames={pokemonNames} />
      </div>
    </header>
  );
};

export default Header;
