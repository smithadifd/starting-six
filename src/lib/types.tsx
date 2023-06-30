type PokemonType = {
  type: {
    name: string;
    url: string;
  };
};

type Pokemon = {
  name: string;
  id: number;
  url: string;
  types: PokemonType[];
};

export type { Pokemon, PokemonType };