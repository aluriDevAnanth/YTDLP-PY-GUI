import "@vidstack/react/player/styles/default/theme.css";
import "@vidstack/react/player/styles/default/layouts/audio.css";
import "@vidstack/react/player/styles/default/layouts/video.css";

import {
  MediaPlayer,
  MediaPlayerInstance,
  MediaProvider,
  Menu,
  Poster,
} from "@vidstack/react";
import {
  defaultLayoutIcons,
  DefaultVideoLayout,
} from "@vidstack/react/player/layouts/default";
import { Dialog } from "primereact/dialog";
import { useRef, useState, type Dispatch, type SetStateAction } from "react";
import type { VideoT } from "src/schema";
import axios from "axios";
import useVideoStore from "src/context/videoStore";
import { Icon } from "@iconify/react";

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
  const [speedIndex, setSpeedIndex] = useState(1.5);

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
            speedUp: "d",
            slowDown: "a",
            speedReset: {
              keys: ["s"],
              onKeyUp({ player }: { player: MediaPlayerInstance }) {
                player.playbackRate = 1;
              },
            },
            speeddUp: {
              keys: ["w"],
              onKeyUp({ player }: { player: MediaPlayerInstance }) {
                if (player.playbackRate == 1) player.playbackRate = speedIndex;
                else player.playbackRate = 1;
              },
            },
          }}
        >
          <MediaProvider>
            <Poster className="vds-poster" />
          </MediaProvider>
          <DefaultVideoLayout
            thumbnails={"http://localhost:8000/api/files/" + rowData.vttPathId}
            download
            icons={defaultLayoutIcons}
            slots={{
              beforeSettingsMenu: (
                <BoostSpeedMenu speed={speedIndex} setSpeed={setSpeedIndex} />
              ),
            }}
          />
        </MediaPlayer>
      </div>
    </Dialog>
  );
}

const SPEEDS = [0.5, 0.75, 1.25, 1.5, 2, 3, 4];

function BoostSpeedMenu({
  speed,
  setSpeed,
}: {
  speed: number;
  setSpeed: (speed: number) => void;
}) {
  return (
    <Menu.Root className="vds-menu">
      <Menu.Button className="vds-menu-button vds-button !min-w-fit !p-0">
        <span className="font-bold p-3">{speed} x</span>
      </Menu.Button>
      <Menu.Items
        className="vds-menu-items !min-w-fit !min-h-fit"
        placement="top"
        offset={0}
      >
        <Menu.RadioGroup className="vds-radio-group" value={speed.toString()}>
          {SPEEDS.map((s) => (
            <Menu.Radio
              key={s}
              value={s.toString()}
              className="vds-radio"
              onSelect={() => setSpeed(s)}
            >
              <Icon
                icon="mdi:check"
                className="vds-icon"
                width={20}
                height={20}
              />
              <span>{s} x</span>
            </Menu.Radio>
          ))}
        </Menu.RadioGroup>
      </Menu.Items>
    </Menu.Root>
  );
}
