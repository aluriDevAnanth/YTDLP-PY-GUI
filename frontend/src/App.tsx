import { clsx } from "clsx";
import { Toast } from "primereact/toast";
import { useRef } from "react";
import { useStartupSSEStore } from "./context/SSEStore";
import Header from "./pages/components/Header";
import SocketHandler from "./pages/components/SocketHandler";
import Home from "./pages/Home";

function App() {
  const toastMain = useRef<Toast>(null);

  const startupp = useStartupSSEStore(
    (state) => state.sse?.["startupp"]?.["startupp"],
  );
  const isLoading = startupp?.typee;

  return (
    <>
      {isLoading === "ongoing" && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-[#1e1e24] text-white">
          <div className="text-center font-sans">
            <div className="mx-auto mb-5 h-12 w-12 animate-spin rounded-full border-4 border-white/10 border-t-[#3b82f6]"></div>
            <h2 className="text-lg font-medium tracking-wide">
              {startupp?.message || "Connecting to services..."}
            </h2>
          </div>
        </div>
      )}

      {isLoading === "error" && (
        <div className="fixed inset-0 z-[99999] flex flex-col items-center justify-center bg-[#1e1e24] text-white p-6">
          <div className="text-center font-sans max-w-md">
            {/* Visual Anchor Warning Icon */}
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-red-500/10 text-red-500">
              <svg
                className="h-8 w-8"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
            </div>
            <h2 className="text-xl font-semibold tracking-wide text-red-400 mb-2">
              Backend Starup Failed
            </h2>
            <p className="text-sm text-gray-400 mb-6">
              {startupp?.message ||
                "An unexpected error occurred while initializing services."}
            </p>
          </div>
        </div>
      )}

      <div
        className={clsx(
          "transition-opacity duration-400 ease-in-out",
          isLoading !== "success"
            ? "pointer-events-none opacity-0"
            : "opacity-100",
        )}
      >
        <Toast ref={toastMain} />
        <SocketHandler toastRef={toastMain} />
        <Header />
        <Home />
      </div>
    </>
  );
}

export default App;
