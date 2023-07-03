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

type Stat = {
  base_stat: number;
  effort: number;
  stat: {
    name: string;
    url: string;
  };
};

type Stats = Stat[];

type Ability = {
  ability: {
    name: string;
    url: string;
  };
  is_hidden: boolean;
  slot: number;
};

type Abilities = Ability[];

export type { Pokemon, PokemonType, Stat, Stats, Ability, Abilities };