import { useAppSelector } from "hooks/app";
import { useParams } from "react-router";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faArrowRight } from "@fortawesome/free-solid-svg-icons";

import { useGetPokemonByNameQuery } from "services/api";

import Sprite from "components/pokemon/Sprite";
import Type from "components/pokemon/Type";

interface TeamEffectivnessProps {
  effectiveness?: Map<string, Map<string, number>>;
}

type Params = {
  pokemonName: string;
};

const TeamEffectiveness = ({
  effectiveness = new Map(),
}: TeamEffectivnessProps) => {
  const params = useParams<Params>();
  const { pokemonName = "" } = params;
  const { data: opponent } = useGetPokemonByNameQuery(pokemonName);
  const chosenPokemon = useAppSelector((state) => state.pokemon.chosenPokemon);

  if (!effectiveness.size || Object.keys(chosenPokemon).length === 0) {
    return <div className="flex flex-col">N/A</div>;
  }

  const getNumber = (name: string) => chosenPokemon[name].id;

  return (
    <div className="flex flex-col">
      {Array.from(effectiveness.entries()).map(([name, collection]) => {
        const number = getNumber(name);
        return (
          <div key={name} className="flex flex-row items-center">
            <Sprite number={number} alt={name} />
            <FontAwesomeIcon icon={faArrowRight} />
            <div className="mx-2 flex flex-col items-center justify-center">
              {Array.from(collection.entries()).map(([type, eff]) => (
                <Type
                  key={type}
                  type={type}
                  effectiveness={eff}
                  className="my-1"
                />
              ))}
            </div>
            <FontAwesomeIcon icon={faArrowRight} />
            {opponent && <Sprite number={opponent.id} alt={opponent.name} />}
          </div>
        );
      })}
    </div>
  );
};

export default TeamEffectiveness;
