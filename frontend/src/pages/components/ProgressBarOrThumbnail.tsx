import useVideoStore from "src/context/videoStore";
import { type VideoT } from "src/schema";
import { ProgressBar } from "primereact/progressbar";
import { ProgressSpinner } from "primereact/progressspinner";
import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { Button } from "primereact/button";
import { Icon } from "@iconify/react";

export default function ProgressBarOrThumbnail({
  rowData,
}: {
  rowData: VideoT;
}) {
  const videoProgress = useVideoStore((state) => state.videoProgress);
  const upsertVideo = useVideoStore((state) => state.upsertVideo);
  const [copied, setCopied] = useState<boolean>(false);
  const progress = useMemo(
    () => videoProgress[rowData.id],
    [videoProgress, rowData.id],
  );
  const percent = useMemo(() => {
    const val = progress?.percent?.toString().replace("%", "");
    return val ? parseInt(val) : 0;
  }, [progress]);

  useEffect(() => {
    if (percent === 100 && rowData.downloadStatus !== "completed") {
      axios
        .get<VideoT>(`http://localhost:8000/api/video/${rowData.id}`)
        .then((response) => upsertVideo(response.data))
        .catch(console.error);
    }
  }, [percent, rowData.id, rowData.downloadStatus, upsertVideo]);

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

  if (percent === 100 || rowData.downloadStatus === "completed") {
    return (
      <div className="space-x-3 flex items-center">
        <span>{rowData.id}</span>
        <span>
          <Button onClick={handleCopy} className="px-1 py-[2px]">
            <Icon
              icon={copied ? "tabler:check" : "tabler:copy"}
              className="stroke-3 text-[20px] font-bold"
            />
          </Button>
        </span>
      </div>
    );
  }

  if (progress) {
    return (
      <div className="max-w-fit flex flex-col gap-[6px]">
        <ProgressBar className="w-[15vw]" value={percent} />
        <div className="flex justify-between gap-3">
          <div>{progress.downloadedSize} </div>
          <div>{progress.speed}</div>
          <div>{progress.eta}</div>
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
