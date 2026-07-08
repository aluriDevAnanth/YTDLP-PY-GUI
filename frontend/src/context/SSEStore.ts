import { create } from "zustand";
import { immer } from "zustand/middleware/immer";

export interface MandatorySSEFields {
  sseType: string;
  dataID: string;
}

export interface SSET<T extends MandatorySSEFields> {
  [sseType: string]: {
    [dataID: string]: T;
  };
}

interface SSEStore<T extends MandatorySSEFields> {
  sse: SSET<T>;
  upsertSSE: (item: T) => void;
  removeSSE: (item: T) => void;
}

const createSSEStore = <T extends MandatorySSEFields>(storeName: string) =>
  create<SSEStore<T>>()(
    immer((set) => ({
      sse: {},

      upsertSSE: (item) =>
        set((state) => {
          if (!item.sseType || !item.dataID) {
            console.error(
              "[Error](upsertSSE): sseType or dataID missing:",
              item,
            );
            return;
          }

          if (!state.sse[item.sseType]) {
            state.sse[item.sseType] = {};
          }

          state.sse[item.sseType][item.dataID] =
            item as unknown as (typeof state.sse)[string][string];
        }),

      removeSSE: (item) =>
        set((state) => {
          if (state.sse[item.sseType]?.[item.dataID]) {
            delete state.sse[item.sseType][item.dataID];

            if (Object.keys(state.sse[item.sseType]).length === 0) {
              delete state.sse[item.sseType];
            }
          }
        }),
    })),
  );

export type StartupSSE = MandatorySSEFields & {
  message: string;
  typee: "success" | "error" | "ongoing";
};

// Initialize the hook instance directly from the configured creator function
export const useStartupSSEStore =
  createSSEStore<StartupSSE>("startup_sse_store");

export default createSSEStore;
