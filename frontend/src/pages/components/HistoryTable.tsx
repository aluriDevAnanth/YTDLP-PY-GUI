import { Column } from "primereact/column";
import { DataTable } from "primereact/datatable";
import { Tag } from "primereact/tag";
import { Tooltip } from "primereact/tooltip";
import TableRowOptionMenu from "./TableRowOptionMenu";
import {
  useEffect,
  useState,
  useCallback,
  createContext,
  useContext,
  type JSX,
  memo,
} from "react";
import axios from "axios";
import useVideoStore from "src/context/videoStore";
import VideoDialog from "./VideoDialog";
import { Icon } from "@iconify/react/dist/iconify.js";
import { Button } from "primereact/button";
import ProgressBarOrThumbnail from "./ProgressBarOrThumbnail";
import { FilterMatchMode } from "primereact/api";
import { InputText } from "primereact/inputtext";

import { type VideoT } from "src/schema";

interface HoverState {
  url: string;
  x: number;
  y: number;
}

interface HoverContextType {
  setHoveredThumbnail: (state: HoverState | null) => void;
}

const HoverContext = createContext<HoverContextType | null>(null);

interface ThumbnailPreviewProps {
  hoveredThumbnail: HoverState;
}

const ThumbnailPreview = memo(({ hoveredThumbnail }: ThumbnailPreviewProps) => {
  const windowWidth = window.innerWidth;
  const previewWidth = 0.4 * windowWidth;
  const { url, x } = hoveredThumbnail;

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
});
ThumbnailPreview.displayName = "ThumbnailPreview";

function PreviewPortalContainer() {
  const context = useContext(HoverContext);
  const [previewState, setPreviewState] = useState<HoverState | null>(null);

  useEffect(() => {
    if (context) {
      (context as any)._registerSetter(setPreviewState);
    }
  }, [context]);

  if (!previewState) return null;
  return <ThumbnailPreview hoveredThumbnail={previewState} />;
}

const BooleanTemplate = memo(
  ({ rowData, field }: { rowData: VideoT; field: keyof VideoT }) => {
    const value =
      field == "downloaded"
        ? rowData["downloadStatus"] == "completed"
        : rowData[field];
    return (
      <Tag
        pt={{ value: { style: { lineHeight: "1" } } }}
        data-pr-tooltip={value ? "" : "Not " + field}
        data-pr-position="top"
        value={field[0].toUpperCase()}
        severity={value ? "success" : "danger"}
      />
    );
  },
);
BooleanTemplate.displayName = "BooleanTemplate";

interface TableCellProps {
  rowData: VideoT;
  onTagDoubleClick: (video: VideoT) => void;
}

const TagsCell = memo(({ rowData, onTagDoubleClick }: TableCellProps) => {
  const hoverCtx = useContext(HoverContext);

  const handleMouseEnter = (event: React.MouseEvent) => {
    if (!hoverCtx) return;
    const rect = event.currentTarget.getBoundingClientRect();
    hoverCtx.setHoveredThumbnail({
      url: `${import.meta.env.VITE_FILE_BASE_URL || "http://localhost:8000/api/files/"}${rowData.thumbnailPathId || ""}`,
      x: rect.right + 60,
      y: rect.top,
    });
  };

  const handleMouseLeave = () => {
    if (hoverCtx) hoverCtx.setHoveredThumbnail(null);
  };

  return (
    <div
      className="flex gap-2 cursor-pointer select-none"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onDoubleClick={(e) => {
        e.stopPropagation();
        e.preventDefault();
        onTagDoubleClick(rowData);
      }}
    >
      <BooleanTemplate rowData={rowData} field="watched" />
      <BooleanTemplate rowData={rowData} field="downloaded" />
    </div>
  );
});
TagsCell.displayName = "TagsCell";

const UrlBody = memo(({ rowData }: { rowData: VideoT }) => {
  return (
    <div className="space-x-1">
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
      <CopyUrlButton rowData={rowData} />
    </div>
  );
});
UrlBody.displayName = "UrlBody";

function TableGrid({
  onTagDoubleClick,
}: {
  onTagDoubleClick: (video: VideoT) => void;
}) {
  const videos = useVideoStore((state) => state.videos);
  const globalFilter = useVideoStore((state) => state.globalFilter);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchVideos = async () => {
      try {
        const response = await axios.get(
          `${import.meta.env.VITE_BASE_URL}/videos`,
          { headers: { "Content-Type": "application/json" } },
        );
        useVideoStore.setState({
          videos: Object.fromEntries(
            response.data.map((v: VideoT) => [v.id, v]),
          ),
        });
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };
    fetchVideos();
  }, []);

  const videosData = Object.values(videos).filter(Boolean);

  const renderTextInputFilter = useCallback((placeholder: string) => {
    return (options: any) => (
      <InputText
        value={options.value || ""}
        onChange={(e) => options.filterApplyCallback(e.target.value)}
        placeholder={placeholder}
        className="p-inputtext-sm"
      />
    );
  }, []);

  return (
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
      pt={{ root: { className: "text-[14px]" } }}
    >
      <Column
        field="url"
        header="URL"
        body={(rowData: VideoT) => <UrlBody rowData={rowData} />}
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
        filterElement={renderTextInputFilter("Search by name")}
      />
      <Column
        field="size"
        header="Size"
        sortable
        showFilterMenu={false}
        filter
        filterMatchMode={FilterMatchMode.CONTAINS}
        filterElement={renderTextInputFilter("e.g. 20MiB")}
      />
      <Column
        field="resolution"
        header="Resolution"
        sortable
        filter
        filterPlaceholder="e.g. 720p"
        showFilterMenu={false}
        filterMatchMode={FilterMatchMode.CONTAINS}
        filterElement={renderTextInputFilter("e.g. 720")}
      />
      <Column
        header="Tags"
        body={(rowData) => (
          <TagsCell rowData={rowData} onTagDoubleClick={onTagDoubleClick} />
        )}
      />
    </DataTable>
  );
}

interface CopyButtonProps {
  rowData: VideoT;
}

function CopyUrlButton({ rowData }: CopyButtonProps): JSX.Element {
  const [copied, setCopied] = useState<boolean>(false);

  const handleCopy = async (
    e: React.MouseEvent<HTMLButtonElement>,
  ): Promise<void> => {
    e.preventDefault();
    try {
      await navigator.clipboard.writeText(rowData.url);
      setCopied(true);

      setTimeout(() => {
        setCopied(false);
      }, 1000);
    } catch (err) {
      console.error("Failed to copy text: ", err);
    }
  };

  return (
    <Button onClick={handleCopy} className="px-1 py-[2px]">
      <Icon
        icon={copied ? "tabler:check" : "tabler:copy"}
        className="stroke-3 text-[20px] font-bold"
      />
    </Button>
  );
}

export default function HistoryTable() {
  const [visible, setVisible] = useState(false);
  const [selectedVideo, setSelectedVideo] = useState<VideoT>();

  // Use a stable reference proxy to bypass provider value re-renders
  const [contextValue] = useState(() => {
    let registerSetter: (s: HoverState | null) => void = () => {};
    return {
      setHoveredThumbnail: (state: HoverState | null) => registerSetter(state),
      _registerSetter: (setter: any) => {
        registerSetter = setter;
      },
    };
  });

  const handleTagDoubleClick = useCallback((video: VideoT) => {
    setSelectedVideo(video);
    setVisible(true);
  }, []);

  return (
    <HoverContext.Provider value={contextValue}>
      <div className="p-2 relative">
        <Tooltip target=".qqq" mouseTrack mouseTrackLeft={10} />

        {selectedVideo && (
          <VideoDialog
            visible={visible}
            setVisible={setVisible}
            rowData={selectedVideo}
          />
        )}

        {/* This updates inside its own boundary whenever state changes */}
        <PreviewPortalContainer />

        {/* This grid is now completely untouched by hover updates */}
        <TableGrid onTagDoubleClick={handleTagDoubleClick} />
      </div>
    </HoverContext.Provider>
  );
}
