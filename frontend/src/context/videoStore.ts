/* eslint-disable @typescript-eslint/no-unused-vars */
import { create } from 'zustand'
import { devtools } from 'zustand/middleware'
import type { VideoProgressT, VideoT } from 'src/schema'

const useVideoStore = create<VideoStore>()(
    devtools(
        (set) => ({
            videos: {},
            videoProgress: {},
            globalFilter: '',

            upsertVideo: (video: VideoT) =>
                set((state) => ({
                    videos: {
                        ...state.videos,
                        [video.id]: video
                    }
                })),

            removeVideo: (id: string) =>
                set((state) => {
                    const { [id]: _, ...remainingVideos } = state.videos
                    return { videos: remainingVideos }
                }),

            upsertVideoProgress: (progress: VideoProgressT) =>
                set((state) => ({
                    videoProgress: {
                        ...state.videoProgress,
                        [progress.videoId]: progress
                    }
                })),

            removeVideoProgress: (id: string) =>
                set((state) => {
                    const { [id]: _, ...remainingProgress } = state.videoProgress
                    return { videoProgress: remainingProgress }
                }),

            setGlobalFilter: (filter: string) =>
                set({ globalFilter: filter })
        }),
        {
            name: 'video-store',
            enabled: process.env.NODE_ENV !== 'production'
        }
    )
)

interface VideoStore {
    videos: Record<string, VideoT>
    videoProgress: Record<string, VideoProgressT>
    globalFilter: string

    upsertVideo: (video: VideoT) => void
    removeVideo: (id: string) => void

    upsertVideoProgress: (progress: VideoProgressT) => void
    removeVideoProgress: (id: string) => void

    setGlobalFilter: (filter: string) => void
}

export default useVideoStore