import { Toast } from "primereact/toast";
import { useEffect } from "react";
import { useStartupSSEStore, type StartupSSE } from "src/context/SSEStore";
import useVideoStore from "src/context/VideoStore";
import { VideoS, type NotifyT, type VideoProgressT } from "src/schema";
import { socket } from "src/socket";

type Props = {
  toastRef: React.RefObject<Toast | null>;
};

export default function SocketHandler({ toastRef }: Props) {
  const upsertVideoProgress = useVideoStore((s) => s.upsertVideoProgress);
  const upsertVideo = useVideoStore((s) => s.upsertVideo);
  const upsertSSE = useStartupSSEStore((state) => state.upsertSSE);

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

    socket.on("startupp", (data: StartupSSE) => {
      upsertSSE({
        ...data,
        // typee: "ongoing",
        // typee: "error",
        sseType: "startupp",
        dataID: "startupp",
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
