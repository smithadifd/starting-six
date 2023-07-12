import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

import { Pokemon } from "lib/types";

interface PostsResponse {
  count: number;
  next: string;
  previous: string;
  results: Pokemon[];
}

export const api = createApi({
  reducerPath: "api",
  baseQuery: fetchBaseQuery({ baseUrl: "https://pokeapi.co/api/v2/" }),
  endpoints: (builder) => ({
    getPokemonList: builder.query<PostsResponse, void>({
      query: () => "pokemon/?limit=-1",
    }),
    getPokemonByName: builder.query({
      query: (name: string) => `pokemon/${name}`,
    }),
    getTypeByName: builder.query({
      query: (name: string) => {
        return `type/${name}`;
      },
    }),
  }),
});

export const {
  useGetPokemonByNameQuery,
  useGetPokemonListQuery,
  useGetTypeByNameQuery,
} = api;
export default api;
