import { PokemonType } from "lib/types";

import Type from "components/pokemon/Type";

interface PokemonTypesProps {
  types: PokemonType[];
}

function Types({ types }: PokemonTypesProps) {
  return (
    <div className="flex">
      {types.map((type) => (
        <Type key={type.type.name} type={type.type.name} className="mx-1" />
      ))}
    </div>
  );
}

export default Types;
