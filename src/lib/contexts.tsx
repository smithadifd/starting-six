import { createContext } from "react";

type ContextFunction = (pokemonName: string) => void;
// eslint-disable-next-line @typescript-eslint/no-empty-function
export const PokemonDetailsContext = createContext<ContextFunction>(() => {});
