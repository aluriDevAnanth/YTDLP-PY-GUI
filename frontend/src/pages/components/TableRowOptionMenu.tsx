import { useRef, useState, type ReactNode } from "react";
import { Button } from "primereact/button";
import { Toast } from "primereact/toast";
import { Icon } from "@iconify/react/dist/iconify.js";
import axios, { type AxiosRequestConfig } from "axios";
import { type VideoT } from "src/schema";
import fileDownload from "js-file-download";
import useVideoStore from "src/context/videoStore";
import VideoDialog from "./VideoDialog2";
import { Dialog } from "primereact/dialog";

export default function TableRowOptionMenu(rowData: VideoT): ReactNode {
  const toast = useRef<Toast>(null);
  const [visible, setVisible] = useState(false);
  const [info, setInfo] = useState(false);
  const removeVideo = useVideoStore((state) => state.removeVideo);

  function downloadVideo() {
    const config: AxiosRequestConfig<object> = {
      method: "get",
      maxBodyLength: Infinity,
      url: `http://localhost:8000/api/files/${rowData.videoPathId}`,
      headers: {},
      responseType: "blob",
    };

    axios
      .request(config)
      .then((response) => {
        fileDownload(response.data, `${rowData.fullTitle}.mp4`);
      })
      .catch((error) => {
        console.error(error);
      });
  }

  async function deleteVideo() {
    const config: AxiosRequestConfig = {
      method: "delete",
      maxBodyLength: Infinity,
      url: `http://localhost:8000/api/video/${rowData.id}`,
      headers: {},
    };

    await axios
      .request(config)
      .then(() => {
        removeVideo(rowData.id);
      })
      .catch((error) => {
        console.error(error);
      });
  }

  return (
    <div className="relative group inline-flex items-center">
      <Toast ref={toast} />

      {info && (
        <Dialog
          header={`Info for video ${rowData.fullTitle}`}
          visible={info}
          style={{ width: "50vw" }}
          onHide={() => setInfo(false)}
          dismissableMask
        >
          <pre>{JSON.stringify(rowData, null, 2)}</pre>
        </Dialog>
      )}

      {visible && (
        <VideoDialog
          visible={visible}
          setVisible={setVisible}
          rowData={rowData}
        />
      )}

      <Button onClick={() => setVisible(true)} className="px-1 py-[2px]">
        <Icon icon="tabler:play" className="stroke-3 text-[20px] font-bold" />
      </Button>

      <div
        className="absolute left-full top-0 ml-2 opacity-0 group-hover:opacity-100 hover:opacity-100 transition-opacity duration-200 space-x-2 z-50 bg-transparent"
        onClick={(e) => e.stopPropagation()}
      >
        <Button
          onClick={downloadVideo}
          severity="success"
          className="px-1 py-[2px]"
        >
          <Icon
            icon="tabler:download"
            className="stroke-3 text-[20px] font-bold"
          />
        </Button>
        <Button
          onClick={() => setInfo(true)}
          severity="warning"
          className="px-1 py-[2px]"
        >
          <Icon
            icon="tabler:info-circle"
            className="stroke-3 text-[20px] font-bold"
          />
        </Button>
        <Button
          onClick={deleteVideo}
          severity="danger"
          className="px-1 py-[2px]"
        >
          <Icon
            icon="tabler:trash"
            className="stroke-3 text-[20px] font-bold"
          />
        </Button>
      </div>
    </div>
  );
}
