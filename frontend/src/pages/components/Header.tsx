import { Icon } from "@iconify/react/dist/iconify.js";
import { Button } from "primereact/button";
import { Dialog } from "primereact/dialog";
import { InputText } from "primereact/inputtext";
import { Menubar } from "primereact/menubar";
import { useState } from "react";
import useVideoStore from "src/context/VideoStore";
import DownloadForm from "./DownloadForm";
import ThemeSwitcher from "./ThemeSwitcher";

interface HeaderProps {
  onRestart: () => void;
  isRestarting: boolean;
}

function Header({ onRestart, isRestarting }: HeaderProps) {
  const [visible, setVisible] = useState(false);
  const globalFilter = useVideoStore((state) => state.globalFilter);
  return (
    <>
      <Dialog
        header="Header"
        visible={visible}
        style={{ width: "80vw" }}
        onHide={() => {
          if (!visible) return;
          setVisible(false);
        }}
        dismissableMask
        showHeader={false}
        pt={{ content: { className: "px-3 py-3" } }}
        position="top"
      >
        <div>
          <DownloadForm />
        </div>
      </Dialog>
      <Menubar
        pt={{
          end: { className: "ml-0" },
          start: { className: "flex-none" },
          menu: { className: "px-auto px-3 mx-auto flex" },
          action: { className: "px-3 " },
        }}
        /* model={items} */
        start={
          <div className="  flex gap-3 items-center">
            <div className="font-bold text-lg text-gray-800 dark:text-white">
              YTDLP-X-GUI
            </div>
            <div>
              <InputText
                value={globalFilter}
                onChange={(e) =>
                  useVideoStore.setState(() => ({
                    globalFilter: e.target.value,
                  }))
                }
                placeholder="Search videos..."
                className="w-full p-inputtext-sm"
              />
            </div>

            <div>
              <Button
                onClick={() => setVisible(true)}
                className="py-[2px] px-[2px]"
                severity="success"
                aria-label="Filter"
              >
                <Icon icon="tabler:plus" className="text-[28px]" />
              </Button>
            </div>
          </div>
        }
        end={
          <div className="flex items-center gap-2">
            {/* Backend Restart Button */}
            <Button
              onClick={onRestart}
              disabled={isRestarting}
              className="py-[4px] px-[4px]"
              severity="danger"
              outlined
              tooltip="Restart Backend Server"
              tooltipOptions={{ position: "bottom" }}
            >
              <Icon icon="tabler:refresh" className="text-[22px]" />
            </Button>
            <ThemeSwitcher />
          </div>
        }
        className="rounded-lg border-b shadow-sm px-3 py-2"
      />
    </>
  );
}

export default Header;
