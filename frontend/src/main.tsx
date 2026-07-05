import "primeicons/primeicons.css";
import { PrimeReactProvider } from "primereact/api";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <PrimeReactProvider>
    <App />
  </PrimeReactProvider>,
);
