import Header from "./pages/components/Header";
import SocketHandler from "./pages/components/SocketHandler";
import Home from "./pages/Home";
import { Toast } from "primereact/toast";
import { useRef } from "react";

function App() {
  const toastMain = useRef<Toast>(null);

  return (
    <>
      <Toast ref={toastMain} />
      <SocketHandler toastRef={toastMain} />
      <Header />
      <Home />
    </>
  );
}

export default App;
