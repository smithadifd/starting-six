// PokéAPI v2 response shapes

export interface NamedAPIResource {
  name: string;
  url: string;
}

export interface PaginatedResponse<T = NamedAPIResource> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export interface VersionGroupResponse {
  id: number;
  name: string;
  order: number;
  generation: NamedAPIResource;
  pokedexes: NamedAPIResource[];
}

export interface PokedexResponse {
  id: number;
  pokemon_entries: {
    entry_number: number;
    pokemon_species: NamedAPIResource;
  }[];
}

export interface PokemonSpeciesResponse {
  id: number;
  name: string;
  names: { language: NamedAPIResource; name: string }[];
  generation: NamedAPIResource;
  is_legendary: boolean;
  is_mythical: boolean;
  is_baby: boolean;
  varieties: {
    is_default: boolean;
    pokemon: NamedAPIResource;
  }[];
}

export interface PokemonResponse {
  id: number;
  name: string;
  species: NamedAPIResource;
  stats: {
    base_stat: number;
    stat: NamedAPIResource;
  }[];
  types: {
    slot: number;
    type: NamedAPIResource;
  }[];
  abilities: {
    slot: number;
    is_hidden: boolean;
    ability: NamedAPIResource;
  }[];
  moves: {
    move: NamedAPIResource;
  }[];
  sprites: {
    front_default: string | null;
    front_shiny: string | null;
  };
}

export interface AbilityResponse {
  id: number;
  name: string;
  effect_entries: {
    effect: string;
    short_effect: string;
    language: NamedAPIResource;
  }[];
}

export interface MoveResponse {
  id: number;
  name: string;
  type: NamedAPIResource;
  damage_class: NamedAPIResource;
  power: number | null;
  accuracy: number | null;
  pp: number | null;
  effect_entries: {
    short_effect: string;
    language: NamedAPIResource;
  }[];
}
