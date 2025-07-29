import { Button } from "primereact/button";
import { useEffect, useState } from "react";
import { Icon } from "@iconify/react";

const primereact = {
  light: "lara-light-blue",
  dark: "lara-dark-blue",
};

const ThemeSwitcher = () => {
  const [isDark, setIsDark] = useState(
    localStorage.getItem("YTDLP-X-GUI-THEME")
      ? localStorage.getItem("YTDLP-X-GUI-THEME") === "dark"
      : true
  );

  const toggleTheme = () => {
    const newTheme = !isDark ? "dark" : "light";
    localStorage.setItem("YTDLP-X-GUI-THEME", newTheme);
    setIsDark(!isDark);

    document.documentElement.setAttribute("tw-data-theme", newTheme);

    const themeLink = document.getElementById(
      "primereact-theme"
    ) as HTMLLinkElement;
    if (themeLink) {
      themeLink.href = `/themes/${
        !isDark ? primereact.dark : primereact.light
      }/theme.css`;
    }
  };

  useEffect(() => {
    const themeLink = document.createElement("link");
    themeLink.id = "primereact-theme";
    themeLink.rel = "stylesheet";

    themeLink.href = `/themes/${
      isDark ? primereact.dark : primereact.light
    }/theme.css`;

    document.head.appendChild(themeLink);
    document.documentElement.setAttribute(
      "tw-data-theme",
      isDark ? "dark" : "light"
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Button onClick={toggleTheme} className="py-[2px] px-[2px]">
      {isDark ? (
        <Icon className="text-[28px]" icon="tabler:sun" />
      ) : (
        <Icon className="text-[28px]" icon="tabler:moon" />
      )}
    </Button>
  );
};

export default ThemeSwitcher;
