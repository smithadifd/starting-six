import React from "react";
import "./index.scss";
import store from "store/index";
import App from "App";
import { Provider } from "react-redux";
import "tailwindcss/tailwind.css";

import { createBrowserRouter, RouterProvider } from "react-router-dom";

import { createRoot } from "react-dom/client";

import PokemonGrid from "components/pokemon/PokemonGrid";
import Team from "components/team/Team";

const container = document.getElementById("root");

if (!container) throw new Error("Could not find root element with id 'root'");

const router = createBrowserRouter([
  {
    path: "/",
    element: <App />,
    children: [
      {
        index: true,
        element: <PokemonGrid />,
      },
      {
        path: "/team",
        element: <Team />,
      },
    ],
  },
]);
const root = createRoot(container);

root.render(
  <React.StrictMode>
    <Provider store={store}>
      <RouterProvider router={router} />
    </Provider>
  </React.StrictMode>
);
