import { useForm, Controller } from "react-hook-form";
import {
  DownloadFormS,
  VideoS,
  type DownloadFormT,
  type VideoT,
} from "../../schema";
import { InputText } from "primereact/inputtext";
import { Dropdown } from "primereact/dropdown";
import { Button } from "primereact/button";
import { FloatLabel } from "primereact/floatlabel";
import { zodResolver } from "@hookform/resolvers/zod";
import { RadioButton } from "primereact/radiobutton";
import axios from "axios";
import useVideoStore from "src/context/videoStore";
import { Toast } from "primereact/toast";
import { useRef } from "react";

const formatOptions = [
  { label: "Best", value: "best" },
  { label: "Audio Only", value: "audioonly" },
  { label: "Worst", value: "worst" },
];

async function hashUrl(url: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(url);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return hashHex.slice(0, 16); // trim to desired length
}

export default function DownloadForm() {
  const {
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<DownloadFormT>({
    defaultValues: {
      id: "",
      url: "",
      format: "best",
      type: "download",
    },
    resolver: zodResolver(DownloadFormS),
  });
  const upsertVideo = useVideoStore((state) => state.upsertVideo);
  const toastMain = useRef<Toast>(null);

  const onSubmit = async (data: DownloadFormT) => {
    const dataa: VideoT = {
      id: await hashUrl(data.url),
      videoId: "",
      url: data.url,
      size: "",
      fullTitle: "",
      durationString: "",
      resolution: "",
      downloadStatus: "queued",
      audioOnly: false,
      watched: false,
      downloaded: false,
      prevWatchTime: 0,
      format: data.format,
      type: data.type,
      videoPathId: "",
      thumbnailPathId: "",
      vttPathId: "",
      vttSpritePathId: "",
    };

    const config = {
      method: "post",
      maxBodyLength: Infinity,
      url: "http://localhost:8000/api/video",
      headers: {
        "Content-Type": "application/json",
      },
      data: dataa,
    };

    await axios
      .request(config)
      .then((response) => {
        const newVideo = VideoS.parse(response.data);
        upsertVideo(newVideo);
        reset();
      })
      .catch((error) => {
        console.log(error);
        toastMain.current?.show({
          severity: "error",
          summary: "Error",
          detail: `Error while initiating download of video ${error.response?.data?.video?.fullTitle}: ${error.response?.data?.error}`,
        });
      });
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="gap-3 flex w-full">
      <Toast ref={toastMain} />
      <div className="flex flex-col gap-1 w-full mt-5">
        <FloatLabel>
          <Controller
            name="url"
            control={control}
            rules={{ required: "URL is required" }}
            render={({ field }) => (
              <InputText
                id="url"
                {...field}
                value={String(field.value ?? "")}
                className={`${errors.url ? "p-invalid" : ""} w-full`}
              />
            )}
          />
          <label htmlFor="url">Video URL</label>
        </FloatLabel>
        {errors.url && (
          <small className="text-red-500">{errors.url.message}</small>
        )}
      </div>

      <div className="flex flex-col gap-1 mt-5">
        <FloatLabel>
          <Controller
            name="format"
            control={control}
            render={({ field }) => (
              <Dropdown
                id="format"
                {...field}
                options={formatOptions}
                optionLabel="label"
                value={field.value}
                className="w-full"
              />
            )}
          />
          <label htmlFor="format">Format</label>
        </FloatLabel>
      </div>

      <div className="flex flex-col gap-1 justify-end">
        <Controller
          name="type"
          control={control}
          render={({ field }) => (
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <RadioButton
                  className="text-[12px]"
                  inputId="type-download"
                  value="download"
                  checked={field.value === "download"}
                  onChange={(e) => field.onChange(e.value)}
                />
                <label htmlFor="type-download" className="text-xs">
                  Download
                </label>
              </div>
              <div className="flex items-center gap-2">
                <RadioButton
                  className="text-[12px]"
                  inputId="type-scan"
                  value="scan"
                  checked={field.value === "scan"}
                  onChange={(e) => field.onChange(e.value)}
                />
                <label htmlFor="type-scan" className="text-xs">
                  Scan
                </label>
              </div>
            </div>
          )}
        />
      </div>

      <div className=" mt-5">
        <Button
          loading={isSubmitting}
          type="submit"
          label="Download"
          className="w-full"
        />
      </div>
    </form>
  );
}
