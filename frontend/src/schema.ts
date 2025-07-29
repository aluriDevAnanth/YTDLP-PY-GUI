import * as z from "zod";

export const DownloadFormS = z.object({
    id: z.string(),
    url: z.url("Please enter a valid URL"),
    format: z.enum(["best", "bestaudio", "worst"]),
    type: z.enum(["scan", "download"]),
})

export type DownloadFormT = z.infer<typeof DownloadFormS>

export const VideoS = z.object({
    videoId: z.string(),
    fullTitle: z.string(),
    durationString: z.string(),
    size: z.string(),
    resolution: z.string(),
    downloadStatus: z.enum(["queued", "downloading", "paused", "completed", "failed"]),
    audioOnly: z.boolean(),
    watched: z.boolean(),
    downloaded: z.boolean(),
    prevWatchTime: z.number(),
    videoPathId: z.string(),
    thumbnailPathId: z.string(),
    vttPathId: z.string(),
    vttSpritePathId: z.string(),
    ...DownloadFormS.shape
})

export type VideoT = z.infer<typeof VideoS>

export const VideoProgressS = z.object({
    id: z.string(),
    videoId: z.string(),
    eta: z.number(),
    percent: z.number(),
    speed: z.number(),
    downloadedSize: z.number(),
    totalSize: z.number(),
})

export type VideoProgressT = z.infer<typeof VideoProgressS>

export const NotifyS = z.object({
    severity: z.string(),
    summary: z.string(),
    detail: z.string(),
    extraData: z.object(),
})

export type NotifyT = z.infer<typeof NotifyS>