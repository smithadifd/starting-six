import { getClassNames } from "lib/utils";
import { useEffectiveness } from "hooks/pokemon";
import { Pokemon as PokemonType } from "lib/types";

import TypeEffectiveness from "components/pokemon/TypeEffectiveness";

interface TypeEffectivenessContainerProps {
  pokemon: PokemonType;
  className?: string;
  showNormal?: boolean;
}

const TypeEffectivenessContainer = ({
  pokemon,
  className,
  showNormal = false,
}: TypeEffectivenessContainerProps) => {
  const classes = getClassNames("flex flex-col py-2", className);
  const pokemonActions = useEffectiveness(pokemon);
  const normalTypes = Object.fromEntries(
    Object.entries(pokemonActions.defense).filter(([, value]) => value === 1)
  );
  const weakTypes = Object.fromEntries(
    Object.entries(pokemonActions.defense).filter(([, value]) => value > 1)
  );
  const resistantTypes = Object.fromEntries(
    Object.entries(pokemonActions.defense).filter(
      ([, value]) => value < 1 && value > 0
    )
  );
  const immuneTypes = Object.fromEntries(
    Object.entries(pokemonActions.defense).filter(([, value]) => value === 0)
  );

  return (
    <div className={classes}>
      {showNormal && (
        <TypeEffectiveness title="Normal" effectiveTypes={normalTypes} />
      )}
      <TypeEffectiveness title="Weak" effectiveTypes={weakTypes} />
      <TypeEffectiveness title="Resistant" effectiveTypes={resistantTypes} />
      <TypeEffectiveness title="Immune" effectiveTypes={immuneTypes} />
    </div>
  );
};

export default TypeEffectivenessContainer;
