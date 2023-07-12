import { Abilities as AbilitiesType } from "lib/types";

import Ability from "components/pokemon/Ability";

interface AbilitiesProps {
  abilities: AbilitiesType;
}

const Abilities = ({ abilities }: AbilitiesProps) => {
  return (
    <div className="flex flex-wrap justify-center">
      {abilities.map((ability) => (
        <Ability key={ability.ability.name} ability={ability} className="m-1" />
      ))}
    </div>
  );
};

export default Abilities;
