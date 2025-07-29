import useVideoStore from "src/context/videoStore";
import { type VideoT } from "src/schema";
import { ProgressBar } from "primereact/progressbar";
import { ProgressSpinner } from "primereact/progressspinner";
import { useEffect, useMemo } from "react";
import axios from "axios";

export default function ProgressBarOrThumbnail({
  rowData,
}: {
  rowData: VideoT;
}) {
  const videoProgress = useVideoStore((state) => state.videoProgress);
  const upsertVideo = useVideoStore((state) => state.upsertVideo);

  const progress = useMemo(
    () => videoProgress[rowData.id],
    [videoProgress, rowData.id]
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

  if (percent === 100 || rowData.downloadStatus === "completed") {
    return <>{rowData.id}</>;
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
