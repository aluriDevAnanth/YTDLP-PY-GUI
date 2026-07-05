import { Icon } from "@iconify/react";
import axios from "axios";
import { Button } from "primereact/button";
import { ProgressBar } from "primereact/progressbar";
import { ProgressSpinner } from "primereact/progressspinner";
import { useEffect, useMemo, useRef, useState } from "react";
import useVideoStore from "src/context/videoStore";
import { type VideoT } from "src/schema";

function ProgressBarOrID({ rowData }: { rowData: VideoT }) {
  const throttledProgressTime = 1000;

  const videoProgress = useVideoStore((state) => state.videoProgress);
  const upsertVideo = useVideoStore((state) => state.upsertVideo);
  const [copied, setCopied] = useState<boolean>(false);
  const lastUpdated = useRef<number>(0);

  const rawProgress = useMemo(
    () => videoProgress[rowData.id],
    [videoProgress, rowData.id],
  );

  const [throttledProgress, setThrottledProgress] = useState(rawProgress);

  useEffect(() => {
    const now = Date.now();

    const rawVal = rawProgress?.percent?.toString().replace("%", "");
    const rawPercent = rawVal ? parseInt(rawVal) : 0;

    if (rawPercent === 100 || !rawProgress) {
      setThrottledProgress(rawProgress);
      return;
    }

    if (now - lastUpdated.current >= throttledProgressTime) {
      setThrottledProgress(rawProgress);
      lastUpdated.current = now;
    } else {
      const timeoutId = setTimeout(() => {
        setThrottledProgress(rawProgress);
      }, throttledProgressTime);
      return () => clearTimeout(timeoutId);
    }
  }, [rawProgress]);

  const displayPercent = useMemo(() => {
    const val = throttledProgress?.percent?.toString().replace("%", "");
    return val ? parseInt(val) : 0;
  }, [throttledProgress]);

  useEffect(() => {
    const rawVal = rawProgress?.percent?.toString().replace("%", "");
    const rawPercent = rawVal ? parseInt(rawVal) : 0;

    if (rawPercent === 100 && rowData.downloadStatus !== "completed") {
      axios
        .get<VideoT>(`http://localhost:8000/api/video/${rowData.id}`)
        .then((response) => upsertVideo(response.data))
        .catch(console.error);
    }
  }, [rawProgress, rowData.id, rowData.downloadStatus, upsertVideo]);

  const handleCopy = async (
    e: React.MouseEvent<HTMLButtonElement>,
  ): Promise<void> => {
    e.preventDefault();
    try {
      await navigator.clipboard.writeText(rowData.id);
      setCopied(true);
      setTimeout(() => {
        setCopied(false);
      }, 1000);
    } catch (err) {
      console.error("Failed to copy text: ", err);
    }
  };

  if (displayPercent === 100 || rowData.downloadStatus === "completed") {
    return (
      <div className="space-x-3 flex items-center">
        <span>{rowData.id}</span>
        <span>
          <Button
            onClick={handleCopy}
            className="px-1 py-[2px] size-7 flex items-center justify-center"
          >
            <Icon
              icon={copied ? "tabler:check" : "tabler:copy"}
              className="stroke-3 text-[20px] font-bold"
            />
          </Button>
        </span>
      </div>
    );
  }

  if (throttledProgress) {
    return (
      <div className="max-w-fit flex flex-col gap-[6px]">
        <ProgressBar className="w-[15vw]" value={displayPercent} />
        <div className="flex justify-between gap-3 text-xs ">
          <div>{throttledProgress.downloadedSize}</div>
          <div>{throttledProgress.speed}</div>
          <div>{throttledProgress.eta}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex gap-3">
      <ProgressSpinner
        strokeWidth="8"
        animationDuration="1s"
        className="size-6 p-0 m-0"
      />
      <p className="my-auto">Download Metadata...</p>
    </div>
  );
}

export default ProgressBarOrID;
