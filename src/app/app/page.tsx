"use client";

import { useEffect, useCallback } from "react";
import { Sidebar } from "@/components/sidebar/Sidebar";
import { GraphCanvas } from "@/components/canvas/GraphCanvas";
import { SettingsModal } from "@/components/settings/SettingsModal";
import { useSettingsStore } from "@/stores/settingsStore";
import { useUIStore } from "@/stores/uiStore";

export default function AppPage() {
  const provider = useSettingsStore((s) => s.activeProvider);
  const model = useSettingsStore((s) => s.activeModel);
  const layoutMode = useUIStore((s) => s.layoutMode);
  const setLayoutMode = useUIStore((s) => s.setLayoutMode);
  const setSettingsOpen = useUIStore((s) => s.setSettingsOpen);
  const toggleSidebar = useUIStore((s) => s.toggleSidebar);

  // Global keyboard shortcuts
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;
      if (mod && e.key === ",") {
        e.preventDefault();
        setSettingsOpen(true);
      }
      if (mod && e.key === "b") {
        e.preventDefault();
        toggleSidebar();
      }
      if (mod && e.key === "l") {
        e.preventDefault();
        setLayoutMode(layoutMode === "reactflow" ? "d3force" : "reactflow");
      }
    },
    [setSettingsOpen, toggleSidebar, setLayoutMode, layoutMode]
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  return (
    <div className="flex h-screen" style={{ backgroundColor: "var(--color-bg)" }}>
      <Sidebar />

      <div className="flex-1 flex flex-col h-full overflow-hidden">
        {/* Toolbar */}
        <div
          className="flex items-center justify-between px-4 py-2 border-b text-xs"
          style={{
            borderColor: "var(--color-border)",
            backgroundColor: "var(--color-bg-secondary)",
          }}
        >
          <div className="flex items-center gap-3">
            <span className="font-semibold text-sm" style={{ color: "var(--color-text)" }}>
              BranchGPT
            </span>
          </div>
          <div className="flex items-center gap-3" style={{ color: "var(--color-text-secondary)" }}>
            {/* Layout mode toggle */}
            <div className="flex rounded-md overflow-hidden border" style={{ borderColor: "var(--color-border)" }}>
              <button
                onClick={() => setLayoutMode("reactflow")}
                className="px-2 py-0.5 text-[10px] cursor-pointer transition-colors"
                style={{
                  backgroundColor: layoutMode === "reactflow" ? "var(--color-accent)" : "var(--color-bg)",
                  color: layoutMode === "reactflow" ? "white" : "var(--color-text-secondary)",
                }}
              >
                Tree
              </button>
              <button
                onClick={() => setLayoutMode("d3force")}
                className="px-2 py-0.5 text-[10px] cursor-pointer transition-colors"
                style={{
                  backgroundColor: layoutMode === "d3force" ? "var(--color-accent)" : "var(--color-bg)",
                  color: layoutMode === "d3force" ? "white" : "var(--color-text-secondary)",
                }}
              >
                Force
              </button>
            </div>
            <span className="capitalize">{provider}</span>
            <span>/</span>
            <span>{model}</span>
          </div>
        </div>

        {/* Graph Canvas */}
        <GraphCanvas />
      </div>

      <SettingsModal />
    </div>
  );
}
