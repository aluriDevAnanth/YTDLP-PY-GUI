import { Toast } from "primereact/toast";
import { useRef } from "react";
import Header from "./pages/components/Header";
import SocketHandler from "./pages/components/SocketHandler";
import Home from "./pages/Home";

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
