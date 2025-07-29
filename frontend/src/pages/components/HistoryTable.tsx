import { Column } from "primereact/column";
import { DataTable } from "primereact/datatable";
import { type VideoT } from "src/schema";
import { Tag } from "primereact/tag";
import { Tooltip } from "primereact/tooltip";
import TableRowOptionMenu from "./TableRowOptionMenu";
import { useEffect, useState } from "react";
import axios from "axios";
import useVideoStore from "src/context/videoStore";
import VideoDialog from "./VideoDialog2";
import { Icon } from "@iconify/react/dist/iconify.js";
import { Button } from "primereact/button";
import ProgressBarOrThumbnail from "./ProgressBarOrThumbnail";
import { FilterMatchMode } from "primereact/api";
import { InputText } from "primereact/inputtext";

interface ThumbnailPreviewProps {
  url: string;
  x: number;
  y: number;
}

function ThumbnailPreview({ url, x }: ThumbnailPreviewProps) {
  const windowWidth = window.innerWidth;
  const previewWidth = 0.4 * windowWidth;
  const adjustedX =
    x + previewWidth > windowWidth
      ? windowWidth - previewWidth - windowWidth / 2
      : x;
  return (
    <div
      className="z-50 fixed pointer-events-none shadow-xl rounded-md top-1/10"
      style={{
        right: `${adjustedX}px`,
        width: "40vw",
        height: "auto",
        padding: "4px",
      }}
    >
      <img
        src={url}
        alt="Video thumbnail"
        className="w-full h-auto object-contain rounded"
      />
    </div>
  );
}

export default function HistoryTable() {
  const videos = useVideoStore((state) => state.videos);
  const globalFilter = useVideoStore((state) => state.globalFilter);
  const [visible, setVisible] = useState(false);
  const [selectedVideo, setSelectedVideo] = useState<VideoT>();
  const [loading, setLoading] = useState(true);

  function booleanTemplate(rowData: VideoT, field: keyof VideoT) {
    const value = rowData[field];
    return (
      <Tag
        pt={{ value: { style: { lineHeight: "1" } } }}
        data-pr-tooltip={value ? "" : "Not " + field}
        data-pr-position="top"
        className="qqq"
        value={field[0].toUpperCase()}
        severity={value ? "success" : "danger"}
      />
    );
  }

  const [hoveredThumbnail, setHoveredThumbnail] = useState<{
    url: string;
    x: number;
    y: number;
  } | null>(null);

  const handleMouseEnter = (event: React.MouseEvent, video: VideoT) => {
    const rect = event.currentTarget.getBoundingClientRect();
    setHoveredThumbnail({
      url: "http://localhost:8000/api/files/" + video.thumbnailPathId || "",
      x: rect.right + 60,
      y: rect.top,
    });
  };

  const handleMouseLeave = () => {
    setHoveredThumbnail(null);
  };

  useEffect(() => {
    const fetchVideos = async () => {
      try {
        const response = await axios.get(
          `${import.meta.env.VITE_BASE_URL}/videos`,
          {
            headers: { "Content-Type": "application/json" },
          }
        );
        useVideoStore.setState({ videos: response.data });
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };

    fetchVideos();
  }, []);

  const videosData = Object.values(videos).filter(Boolean);

  return (
    <div className="p-2 relative">
      <Tooltip target=".qqq" mouseTrack mouseTrackLeft={10} />

      {selectedVideo && (
        <VideoDialog
          visible={visible}
          setVisible={setVisible}
          rowData={selectedVideo}
        />
      )}

      {hoveredThumbnail && (
        <ThumbnailPreview
          url={hoveredThumbnail.url}
          x={hoveredThumbnail.x}
          y={hoveredThumbnail.y}
        />
      )}

      <DataTable
        value={videosData}
        loading={loading}
        size="small"
        showGridlines
        stripedRows
        resizableColumns
        reorderableColumns
        paginator
        rows={10}
        rowsPerPageOptions={[5, 10, 20]}
        globalFilter={globalFilter}
        removableSort
        sortMode="multiple"
        filterDisplay="row"
        scrollable
        scrollHeight="60vh"
        emptyMessage="No Videos, add using above form"
        pt={{
          root: { className: "text-[14px]" },
        }}
      >
        <Column
          field="url"
          header="URL"
          body={(rowData) => (
            <Button
              onClick={(e) => {
                e.preventDefault();
                window.open(rowData.url, "_blank");
              }}
              className="px-1 py-[2px]"
              severity="info"
            >
              <Icon
                icon="tabler:external-link"
                className="stroke-3 text-[20px] font-bold"
              />
            </Button>
          )}
        />
        <Column
          header="Op"
          body={(rowData) => TableRowOptionMenu(rowData)}
          pt={{ bodyCell: { className: "overflow-visible" } }}
        />

        <Column
          header="ID"
          body={(rowData) => <ProgressBarOrThumbnail rowData={rowData} />}
        />

        <Column
          field="fullTitle"
          header="Name"
          sortable
          filter
          filterPlaceholder="Search by name"
          showFilterMenu={false}
          filterMatchMode={FilterMatchMode.CONTAINS}
          filterElement={(options) => (
            <InputText
              value={options.value || ""}
              onChange={(e) => options.filterApplyCallback(e.target.value)}
              placeholder="Search by name"
              className="p-inputtext-sm"
            />
          )}
        />

        <Column
          field="size"
          header="Size"
          sortable
          showFilterMenu={false}
          filter
          filterMatchMode={FilterMatchMode.CONTAINS}
          filterElement={(options) => (
            <InputText
              value={options.value || ""}
              onChange={(e) => options.filterApplyCallback(e.target.value)}
              placeholder="e.g. 20MiB"
              className="p-inputtext-sm"
            />
          )}
        />

        <Column
          field="resolution"
          header="Resolution"
          sortable
          filter
          filterPlaceholder="e.g. 720p"
          showFilterMenu={false}
          filterMatchMode={FilterMatchMode.CONTAINS}
          filterElement={(options) => (
            <InputText
              value={options.value || ""}
              onChange={(e) => options.filterApplyCallback(e.target.value)}
              placeholder="e.g. 720"
              className="p-inputtext-sm"
            />
          )}
        />

        <Column
          header="Tags"
          body={(rowData) => (
            <div className="flex gap-2 cursor-pointer select-none">
              {booleanTemplate(rowData, "watched")}
              {booleanTemplate(rowData, "downloaded")}
            </div>
          )}
          pt={{
            bodyCell: (q) => ({
              onMouseEnter: (e) => handleMouseEnter(e, q?.state.editingRowData),
              onMouseLeave: handleMouseLeave,
              className: "cursor-pointer ",
              onDoubleClick: (e) => {
                e.stopPropagation();
                e.preventDefault();
                setSelectedVideo(q?.state.editingRowData as VideoT);
                setVisible(true);
              },
            }),
          }}
        />
      </DataTable>
    </div>
  );
}
