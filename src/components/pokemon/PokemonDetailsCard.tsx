import { Pokemon as PokemonType } from "lib/types";
import { getClassNames } from "lib/utils";

import Card from "components/ui/Card";
import PokemonDetails from "components/pokemon/PokemonDetails";

interface PokemonDetailsCardProps {
  pokemon: PokemonType;
  className?: string[] | string;
}

const PokemonDetailsCard = ({
  pokemon,
  className,
}: PokemonDetailsCardProps) => {
  const classes = getClassNames(className);
  return (
    <Card className={classes}>
      <PokemonDetails pokemon={pokemon} />
    </Card>
  );
};

export default PokemonDetailsCard;
