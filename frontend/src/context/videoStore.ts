import type { VideoProgressT, VideoT } from "src/schema";
import { create } from "zustand";
import { devtools } from "zustand/middleware";
import { immer } from "zustand/middleware/immer";

const useVideoStore = create<VideoStore>()(
  devtools(
    immer((set) => ({
      videos: {},
      videoProgress: {},
      globalFilter: "",

      upsertVideo: (video: VideoT) =>
        set((state) => {
          state.videos[video.id] = video;
        }),

      removeVideo: (id: string) =>
        set((state) => {
          delete state.videos[id];
        }),

      upsertVideoProgress: (progress: VideoProgressT) =>
        set((state) => {
          state.videoProgress[progress.id] = progress;
        }),

      removeVideoProgress: (id: string) =>
        set((state) => {
          delete state.videoProgress[id];
        }),

      setGlobalFilter: (filter: string) =>
        set((state) => {
          state.globalFilter = filter;
        }),
    })),
    {
      name: "video-store",
      enabled: process.env.NODE_ENV !== "production",
    },
  ),
);

interface VideoStore {
  videos: Record<string, VideoT>;
  videoProgress: Record<string, VideoProgressT>;
  globalFilter: string;

  upsertVideo: (video: VideoT) => void;
  removeVideo: (id: string) => void;

  upsertVideoProgress: (progress: VideoProgressT) => void;
  removeVideoProgress: (id: string) => void;

  setGlobalFilter: (filter: string) => void;
}

export default useVideoStore;
