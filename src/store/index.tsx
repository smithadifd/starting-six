import { configureStore } from "@reduxjs/toolkit";
import pokemonSlice from "./pokemon";
import { api } from "../services/api";

const store = configureStore({
  reducer: {
    pokemon: pokemonSlice.reducer,
    [api.reducerPath]: api.reducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(api.middleware),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

export default store;
