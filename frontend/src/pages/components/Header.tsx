import { Menubar } from "primereact/menubar";
import ThemeSwitcher from "./ThemeSwitcher";
import { Dialog } from "primereact/dialog";
import { useState } from "react";
import { Button } from "primereact/button";
import { Icon } from "@iconify/react/dist/iconify.js";
import DownloadForm from "./DownloadForm";
import { InputText } from "primereact/inputtext";
import useVideoStore from "src/context/videoStore";

const Header = () => {
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
          <>
            <ThemeSwitcher />
          </>
        }
        className="rounded-lg border-b shadow-sm px-3 py-2"
      />
    </>
  );
};

export default Header;
