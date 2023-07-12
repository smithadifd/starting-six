import { createSlice } from "@reduxjs/toolkit";
import { RootState } from "store";

import { Pokemon } from "lib/types";

type ChosenPokemon = { [key: string]: Pokemon };

interface PokemonState {
  pokemon: Pokemon[];
  chosenPokemon: ChosenPokemon;
}
const initialState: PokemonState = {
  pokemon: [],
  chosenPokemon: {},
};

export const pokemonSlice = createSlice({
  name: "pokemon",
  initialState,
  reducers: {
    setPokemon: (state, action) => {
      state.pokemon = action.payload;
    },
    initializePokemon: (state, action) => {
      state.chosenPokemon = action.payload;
    },
    addPokemon: (state, action) => {
      const pokemon: Pokemon = action.payload;
      state.chosenPokemon[pokemon.name] = pokemon;
      localStorage.setItem(
        "chosenPokemon",
        JSON.stringify(state.chosenPokemon)
      );
    },
    removePokemon: (state, action) => {
      const pokemon: Pokemon = action.payload;
      delete state.chosenPokemon[pokemon.name];
      localStorage.setItem(
        "chosenPokemon",
        JSON.stringify(state.chosenPokemon)
      );
    },
  },
});

export const selectPokemon = (state: RootState) => state.pokemon.pokemon;
export const pokemonActions = pokemonSlice.actions;
export default pokemonSlice;
