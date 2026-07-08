import { Icon } from "@iconify/react";
import {
  MediaPlayer,
  MediaPlayerInstance,
  MediaProvider,
  Menu,
  Poster,
  Tooltip,
  useStore,
} from "@vidstack/react";
import {
  defaultLayoutIcons,
  DefaultVideoLayout,
} from "@vidstack/react/player/layouts/default";
import "@vidstack/react/player/styles/default/layouts/audio.css";
import "@vidstack/react/player/styles/default/layouts/video.css";
import "@vidstack/react/player/styles/default/theme.css";
import axios from "axios";
import { Dialog } from "primereact/dialog";
import {
  type Dispatch,
  type SetStateAction,
  useEffect,
  useRef,
  useState,
} from "react";
import useVideoStore from "src/context/VideoStore";
import type { VideoT } from "src/schema";

const SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 2, 3, 4];

function BoostSpeedMenu({
  speed,
  onSpeedChange,
}: {
  speed: number;
  onSpeedChange: (speed: number) => void;
}) {
  return (
    <Menu.Root className="vds-menu">
      <Menu.Button className="vds-menu-button vds-button !min-w-fit !p-0">
        <Tooltip.Root showDelay={0}>
          <Tooltip.Trigger asChild>
            <span className="font-bold p-3">{speed} X</span>
          </Tooltip.Trigger>
          <Tooltip.Content
            className="vds-tooltip-content"
            placement="top center"
          >
            Current Quick Boost Playback Rate
          </Tooltip.Content>
        </Tooltip.Root>
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
              onSelect={() => {
                onSpeedChange(s);
              }}
            >
              <Icon
                icon="mdi:check"
                className="vds-icon"
                width={20}
                height={20}
              />
              <span>{s}×</span>
            </Menu.Radio>
          ))}
        </Menu.RadioGroup>
      </Menu.Items>
    </Menu.Root>
  );
}

function VideoDialog({
  visible,
  setVisible,
  rowData,
}: {
  visible: boolean;
  setVisible: Dispatch<SetStateAction<boolean>>;
  rowData: VideoT;
}) {
  const player = useRef<MediaPlayerInstance>(null);
  let localPrevWatchTime = rowData.prevWatchTime;
  const notificationTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );

  const { playbackRate } = useStore(MediaPlayerInstance, player);
  const [speedIndex, setSpeedIndex] = useState(1.5);
  const [showSpeedChangeNotification, SetShowSpeedChangeNotification] =
    useState(false);

  const upsertVideo = useVideoStore((state) => state.upsertVideo);

  function markAsWatched(): void {
    const data = { ...rowData };
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

  const handleSpeedChange = (newSpeed: number) => {
    setSpeedIndex(newSpeed);
    if (player.current) {
      player.current.playbackRate = newSpeed;
    }
  };

  useEffect(() => {
    if (playbackRate !== undefined) {
      // Clear any existing timeout
      if (notificationTimeoutRef.current) {
        clearTimeout(notificationTimeoutRef.current);
        notificationTimeoutRef.current = null;
      }

      SetShowSpeedChangeNotification(true);

      notificationTimeoutRef.current = setTimeout(() => {
        SetShowSpeedChangeNotification(false);
        notificationTimeoutRef.current = null;
      }, 1000);
    }

    return () => {
      if (notificationTimeoutRef.current) {
        clearTimeout(notificationTimeoutRef.current);
        notificationTimeoutRef.current = null;
      }
    };
  }, [playbackRate]);

  useEffect(() => {
    const interval = setInterval(() => {
      console.log(rowData.id, rowData.fullTitle, player.current?.currentTime);
      if (localPrevWatchTime == Math.floor(player.current?.currentTime || 0))
        return;

      const config = {
        method: "put",
        maxBodyLength: Infinity,
        url: `http://localhost:8000/api/video/${rowData.id}`,
        headers: {
          "Content-Type": "application/json",
        },
        data: {
          ...rowData,
          prevWatchTime: Math.floor(player.current?.currentTime || 0),
        },
      };

      axios
        .request(config)
        .then((response) => {
          localPrevWatchTime = response.data.prevWatchTime;
        })
        .catch((error: unknown) => {
          console.error(error);
        });
    }, 5000);

    return () => {
      clearInterval(interval);
      upsertVideo({
        ...useVideoStore.getState().videos[rowData.id],
        prevWatchTime: localPrevWatchTime,
      });
    };
  }, []);

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
      {showSpeedChangeNotification && (
        <div className="absolute top-12 left-1/2 transform -translate-x-1/2 z-40 bg-black/60 text-white text-xs px-2.5 py-1 rounded-full pointer-events-none tracking-wider font-medium animate-pulse">
          🚀 {playbackRate}X SPEED
        </div>
      )}
      <MediaPlayer
        ref={player}
        currentTime={rowData.prevWatchTime || 0}
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
          rowData.prevWatchTime == 0
            ? "http://localhost:8000/api/files/" + rowData.thumbnailPathId
            : undefined
        }
        onPlay={markAsWatched}
        keyTarget="document"
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
          speedUp: {
            keys: ["d", "D"],
            onKeyUp({ player }: { player: MediaPlayerInstance }) {
              const currentSpeed = player.playbackRate;
              const nextSpeed =
                SPEEDS.find((s) => s > currentSpeed) ||
                SPEEDS[SPEEDS.length - 1];
              player.playbackRate = nextSpeed;
            },
          },
          slowDown: {
            keys: ["a", "A"],
            onKeyUp({ player }: { player: MediaPlayerInstance }) {
              const currentSpeed = player.playbackRate;
              const prevSpeed =
                [...SPEEDS].reverse().find((s) => s < currentSpeed) ||
                SPEEDS[0];
              player.playbackRate = prevSpeed;
            },
          },
          speedReset: {
            keys: ["s", "S"],
            onKeyUp({ player }: { player: MediaPlayerInstance }) {
              player.playbackRate = 1;
            },
          },
          toggleSpeed: {
            keys: ["w", "W"],
            onKeyUp({ player }: { player: MediaPlayerInstance }) {
              if (player.playbackRate != speedIndex) {
                player.playbackRate = speedIndex;
              } else if (player.playbackRate != 1) {
                player.playbackRate = 1;
              }
            },
          },
        }}
      >
        <MediaProvider>
          <Poster className="vds-poster" />
        </MediaProvider>
        <DefaultVideoLayout
          showTooltipDelay={300}
          seekStep={5}
          thumbnails={"http://localhost:8000/api/files/" + rowData.vttPathId}
          download
          icons={defaultLayoutIcons}
          slots={{
            beforeSettingsMenu: (
              <>
                <Tooltip.Root showDelay={0}>
                  <Tooltip.Trigger asChild>
                    <div
                      data-pr-tooltip="No notifications"
                      data-pr-position="right"
                      className="vds-menu-button vds-button !min-w-fit !p-0"
                    >
                      <span className="font-bold p-3">{playbackRate || 1}</span>
                    </div>
                  </Tooltip.Trigger>
                  <Tooltip.Content
                    className="vds-tooltip-content"
                    placement="top center"
                  >
                    Current Playback Rate
                  </Tooltip.Content>
                </Tooltip.Root>

                <BoostSpeedMenu
                  speed={speedIndex}
                  onSpeedChange={handleSpeedChange}
                />
              </>
            ),
          }}
        />
      </MediaPlayer>
    </Dialog>
  );
}

export default VideoDialog;
