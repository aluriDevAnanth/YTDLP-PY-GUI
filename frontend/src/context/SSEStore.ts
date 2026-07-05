import { create } from "zustand";
import { devtools } from "zustand/middleware";

export type typeFields = { sseType: string; dataID: string };

export type SSET<T extends typeFields> = {
  [sseType: string]: {
    [dataID: string]: T;
  };
};

interface SSEStore<T extends typeFields> {
  sse: SSET<T>;

  upsertSSE: (item: T) => void;
  removeSSE: (item: T) => void;
}

const useSSEStore = <T extends typeFields>() =>
  create<SSEStore<T>>()(
    devtools(
      (set) => ({
        sse: {},
        upsertSSE: (item: T) =>
          set((state) => {
            const currentTypeData = state.sse[item.sseType] || {};
            return {
              sse: {
                ...state.sse,
                [item.sseType]: {
                  ...currentTypeData,
                  [item.dataID]: item,
                },
              },
            };
          }),
        removeSSE: (item: T) =>
          set((state) => {
            if (!state.sse[item.sseType]) return state;
            const updatedTypeData = { ...state.sse[item.sseType] };
            delete updatedTypeData[item.dataID];
            return {
              sse: {
                ...state.sse,
                [item.sseType]: updatedTypeData,
              },
            };
          }),
      }),
      {
        name: "sse-store",
        enabled: process.env.NODE_ENV !== "production",
      },
    ),
  );

export default useSSEStore;
