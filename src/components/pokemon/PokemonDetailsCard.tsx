import { Pokemon as PokemonType } from "lib/types";
import { getClassNames } from "lib/utils";

import Card from "components/ui/Card";
import PokemonDetails from "components/pokemon/PokemonDetails";

interface PokemonDetailsCardProps {
  pokemon: PokemonType;
  className?: string[] | string;
  showAdditionalDetails?: boolean;
}

const PokemonDetailsCard = ({
  pokemon,
  className,
  showAdditionalDetails = true,
}: PokemonDetailsCardProps) => {
  const classes = getClassNames(className);
  return (
    <Card className={classes}>
      <PokemonDetails
        pokemon={pokemon}
        showAdditionalDetails={showAdditionalDetails}
      />
    </Card>
  );
};

export default PokemonDetailsCard;
