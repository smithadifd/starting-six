import { Pokemon as PokemonType } from "lib/types";

import Card from "components/ui/Card";
import PokemonDetails from "components/pokemon/PokemonDetails";

const PokemonDetailsCard = ({ pokemon } : { pokemon: PokemonType }) => {
  return (
    <Card>
      <PokemonDetails pokemon={pokemon} />
    </Card>
  )
};

export default PokemonDetailsCard;