import { useEffect } from "react";
import { Outlet } from "react-router-dom";

import { useAppDispatch } from "app/hooks";

import Layout from "./components/ui/Layout";

function App(): JSX.Element {
  const dispatch = useAppDispatch();
  useEffect(() => {
    const pokemon = localStorage.getItem("chosenPokemon");
    if (pokemon)
      dispatch({
        type: "pokemon/initializePokemon",
        payload: JSON.parse(pokemon),
      });
  }, []);

  return (
    <div className="App">
      <Layout>
        <Outlet />
      </Layout>
    </div>
  );
}

export default App;
