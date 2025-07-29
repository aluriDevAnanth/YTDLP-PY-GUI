import "@vidstack/react/player/styles/default/theme.css";
import "@vidstack/react/player/styles/default/layouts/audio.css";
import "@vidstack/react/player/styles/default/layouts/video.css";

import { MediaPlayer, MediaProvider, Poster } from "@vidstack/react";
import {
  DefaultVideoLayout,
  defaultLayoutIcons,
} from "@vidstack/react/player/layouts/default";
import { Dialog } from "primereact/dialog";
import type { Dispatch, SetStateAction } from "react";
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
  const upsertVideo = useVideoStore((state) => state.upsertVideo);
  function markAsWatched(): void {
    const data = rowData;
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
        console.log(error);
      });
  }

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
          poster={"http://localhost:8000/api/files/" + rowData.thumbnailPathId}
          onPlay={markAsWatched}
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
