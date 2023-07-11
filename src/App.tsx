import { useState, useEffect } from "react";
import { Outlet } from "react-router-dom";

import { useAppDispatch } from "hooks/app";
import { PokemonDetailsContext } from "lib/contexts";

import Layout from "components/ui/Layout";
import PokemonDetailsModal from "components/pokemon/PokemonDetailsModal";

function App(): JSX.Element {
  const dispatch = useAppDispatch();
  const [selectedPokemon, setSelectedPokemon] = useState<String | null>(null);

  const onPokemonClick = (pokemonName: String) => {
    console.log('pokemonName', pokemonName);
    setSelectedPokemon(pokemonName);
  };
  const onClose = () => {
    setSelectedPokemon(null);
  };

  useEffect(() => {
    const pokemon = localStorage.getItem("chosenPokemon");
    if (pokemon)
      dispatch({
        type: "pokemon/initializePokemon",
        payload: JSON.parse(pokemon),
      });
  }, []);

  return (
    <div className="App bg-gradient-to-r from-yellow-50 to-sky-50">
      <PokemonDetailsContext.Provider value={onPokemonClick}>
        <Layout>
          <Outlet />
        </Layout>
      </PokemonDetailsContext.Provider>
      {selectedPokemon && (
        <PokemonDetailsModal name={selectedPokemon} isOpen={Boolean(selectedPokemon)} onClose={onClose} />
      )}
    </div>
  );
}

export default App;
