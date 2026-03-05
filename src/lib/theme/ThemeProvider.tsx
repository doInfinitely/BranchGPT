"use client";

import { useEffect } from "react";
import { useSettingsStore } from "@/stores/settingsStore";
import { applyTheme } from "./themeConfig";

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const provider = useSettingsStore((s) => s.activeProvider);
  const theme = useSettingsStore((s) => s.theme);

  useEffect(() => {
    applyTheme(provider, theme);
  }, [provider, theme]);

  return <>{children}</>;
}
