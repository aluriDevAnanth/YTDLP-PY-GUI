import { useEffect } from "react";
import { Toast } from "primereact/toast";
import { socket } from "src/socket";
import useVideoStore from "src/context/videoStore";
import { VideoS, type NotifyT, type VideoProgressT } from "src/schema";

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
        console.log(ddata.data.id);
        upsertVideo(ddata.data);
      }
    });

    socket.on("status_update", (data: VideoProgressT) => {
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
