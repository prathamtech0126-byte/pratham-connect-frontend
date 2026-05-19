import { useEffect } from "react";
import { useTheme } from "@/components/theme-provider";

export function FaviconUpdater() {
  const { theme } = useTheme();

  useEffect(() => {
    // Determine if we're in dark mode
    const isDarkMode =
      theme === "dark" ||
      (theme === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);

    // Find existing favicon link or create a new one
    let link = document.querySelector("link[rel='icon']") as HTMLLinkElement;

    if (!link) {
      link = document.createElement("link");
      link.rel = "icon";
      document.head.appendChild(link);
    }

    // Update favicon based on theme
    if (isDarkMode) {
      link.href = "/pratham-logo-dark-mode.ico";
    } else {
      link.href = "/pratham-logo-light-mode.ico";
    }

    // Also handle system theme changes
    if (theme === "system") {
      const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
      const handleChange = (e: MediaQueryListEvent) => {
        link.href = e.matches
          ? "/pratham-logo-dark-mode.ico"
          : "/pratham-logo-light-mode.ico";
      };

      mediaQuery.addEventListener("change", handleChange);

      return () => {
        mediaQuery.removeEventListener("change", handleChange);
      };
    }
  }, [theme]);

  return null; // This component doesn't render anything
}
