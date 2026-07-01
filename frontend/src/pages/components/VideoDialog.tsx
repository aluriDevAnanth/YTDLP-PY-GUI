import "@vidstack/react/player/styles/default/theme.css";
import "@vidstack/react/player/styles/default/layouts/audio.css";
import "@vidstack/react/player/styles/default/layouts/video.css";

import {
  MediaPlayer,
  MediaPlayerInstance,
  MediaProvider,
  Poster,
  useMediaStore,
} from "@vidstack/react";
import {
  DefaultVideoLayout,
  defaultLayoutIcons,
} from "@vidstack/react/player/layouts/default";
import { Dialog } from "primereact/dialog";
import { useEffect, useRef, type Dispatch, type SetStateAction } from "react";
import type { VideoT } from "src/schema";
import axios from "axios";
import useVideoStore from "src/context/videoStore";

export default function VideoDialog({
  visible,
  setVisible,
  rowData,
}: {
  visible: boolean;
  setVisible: Dispatch<SetStateAction<boolean>>;
  rowData: VideoT;
}) {
  const player = useRef<MediaPlayerInstance>(null);
  const upsertVideo = useVideoStore((state) => state.upsertVideo);

  function markAsWatched(): void {
    const data = rowData;
    if (data.watched == true) return;
    data.watched = true;

    const config = {
      method: "put",
      maxBodyLength: Infinity,
      url: `http://localhost:8000/api/video/${rowData.id}`,
      headers: {
        "Content-Type": "application/json",
      },
      data: data,
    };

    axios
      .request(config)
      .then((response) => {
        upsertVideo(response.data);
      })
      .catch((error: unknown) => {
        console.error(error);
      });
  }

  /* useEffect(() => {
    const { paused } = player.current!.state;

    // Subscribe for updates without triggering renders.
    return player.current!.subscribe(({ currentTime }) => {});
  }, []); */

  return (
    <Dialog
      position="top"
      closeOnEscape
      maximizable
      visible={visible}
      className="w-[70vw] h-fit"
      showHeader={false}
      onHide={() => setVisible(false)}
      dismissableMask
      pt={{ content: { className: "p-1" } }}
    >
      <div className="w-full h-full aspect-video">
        <MediaPlayer
          ref={player}
          src={{
            src: "http://localhost:8000/api/files/" + rowData.videoPathId,
            type: "video/mp4",
          }}
          viewType="video"
          streamType="on-demand"
          logLevel="warn"
          crossOrigin
          playsInline
          title={rowData.fullTitle}
          poster={
            rowData.prevWatchTime
              ? "http://localhost:8000/api/files/" + rowData.thumbnailPathId
              : undefined
          }
          onPlay={markAsWatched}
          keyTarget="player"
          keyShortcuts={{
            togglePaused: "k Space",
            toggleMuted: "m",
            toggleFullscreen: "f",
            togglePictureInPicture: "i",
            toggleCaptions: "c",
            seekBackward: ["j", "J", "ArrowLeft"],
            seekForward: ["l", "L", "ArrowRight"],
            volumeUp: "ArrowUp",
            volumeDown: "ArrowDown",
            speedUp: ">",
            slowDown: "<",
            fooBar: {
              keys: ["q"],
              onKeyUp({ event, player, remote }) {
                console.log({ event, player, remote });
              },
              async onKeyDown({ event, player, remote }) {
                await new Promise((resolve) => setTimeout(resolve, 500));
              },
            },
          }}
        >
          <MediaProvider>
            <Poster className="vds-poster" />
          </MediaProvider>
          <DefaultVideoLayout
            thumbnails={"http://localhost:8000/api/files/" + rowData.vttPathId}
            icons={defaultLayoutIcons}
            download
          ></DefaultVideoLayout>
        </MediaPlayer>
      </div>
    </Dialog>
  );
}
