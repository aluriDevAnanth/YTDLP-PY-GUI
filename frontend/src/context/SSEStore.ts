import type { StartupSSE } from "src/pages/components/SocketHandler";
import { create } from "zustand";

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

const useSSEStore = <T extends MandatorySSEFields>() =>
  create<SSEStore<T>>()((set) => ({
    sse: {},
    upsertSSE: (item: T) =>
      set((state) => {
        if (!item["sseType"] || !item.dataID) {
          console.log(
            `[Error](upsertSSE): sseType or dataID does not exist on given data: \n ${item}`,
          );
          return {};
        }
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
        if (!state.sse[item.sseType]) return {};

        const updatedTypeData = { ...state.sse[item.sseType] };
        delete updatedTypeData[item.dataID];

        return {
          sse: {
            ...state.sse,
            [item.sseType]: updatedTypeData,
          },
        };
      }),
  }));

export const useStartupSSEStore = useSSEStore<StartupSSE>();

export default useSSEStore;
