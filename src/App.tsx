import { Outlet } from "react-router-dom";

import Layout from "./components/ui/Layout";

function App(): JSX.Element {
  return (
    <div className="App">
      <Layout>
        <Outlet />
      </Layout>
    </div>
  );
}

export default App;
