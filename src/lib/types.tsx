type PokemonType = {
  type: {
    name: string;
    url: string;
  };
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

type Move = {
  move: {
    name: string;
    url: string;
  };
};

type Moves = Move[];

type Pokemon = {
  name: string;
  id: number;
  url: string;
  types: PokemonType[];
  stats: Stats;
  abilities: Abilities;
  moves: Moves;
};

export type {
  Pokemon,
  PokemonType,
  Stat,
  Stats,
  Ability,
  Abilities,
  Move,
  Moves,
};