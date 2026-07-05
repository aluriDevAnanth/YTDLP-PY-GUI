import { Toast } from "primereact/toast";
import { useEffect } from "react";
import useVideoStore from "src/context/videoStore";
import { type NotifyT, type VideoProgressT, VideoS } from "src/schema";
import { socket } from "src/socket";

type Props = {
  toastRef: React.RefObject<Toast | null>;
};

export default function SocketHandler({ toastRef }: Props) {
  const upsertVideoProgress = useVideoStore((s) => s.upsertVideoProgress);
  const upsertVideo = useVideoStore((s) => s.upsertVideo);

  useEffect(() => {
    socket.connect();

    socket.on("connect", () => {});

    socket.on("message", (data) => {
      const ddata = VideoS.safeParse(data);
      if (ddata.success) {
        upsertVideo(ddata.data);
      }
    });

    socket.on("status_update", (data: VideoProgressT) => {
      console.log("upsertVideoProgress", data);
      upsertVideoProgress(data);
    });

    socket.on("notify", (data: NotifyT) => {
      toastRef.current?.show({
        severity: data.severity as
          | "success"
          | "info"
          | "warn"
          | "error"
          | "secondary"
          | "contrast"
          | undefined,
        summary: data.summary ?? "Notification",
        detail: data.detail ?? JSON.stringify(data),
      });
    });

    socket.on("disconnect", () => {
      toastRef.current?.show({
        severity: "warn",
        summary: "Disconnected",
        detail: "Socket connection lost.",
        life: 3000,
      });
    });

    return () => {
      socket.disconnect();
      socket.off();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [toastRef]);

  return null;
}
