import { create } from "zustand";
import type { LayoutMode } from "@/types";

interface UIState {
  sidebarOpen: boolean;
  settingsOpen: boolean;
  layoutMode: LayoutMode;
  composeParentId: string | null;
  hiddenNodeIds: Set<string>;
  previewRestoreIds: Set<string>;
  collapsedNodeIds: Set<string>;

  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  setSettingsOpen: (open: boolean) => void;
  setLayoutMode: (mode: LayoutMode) => void;
  setComposeParentId: (id: string | null) => void;
  hideNode: (id: string) => void;
  restoreNode: (id: string) => void;
  restoreAllNodes: () => void;
  setPreviewRestoreIds: (ids: Set<string>) => void;
  toggleCollapse: (id: string) => void;
}

export const useUIStore = create<UIState>()((set, get) => {
  // Expose store to window for Playwright capture script
  if (typeof window !== "undefined") {
    (window as any).__ZUSTAND_UI_STORE__ = { getState: get, setState: set };
  }
  return {
  sidebarOpen: true,
  settingsOpen: false,
  layoutMode: "reactflow",
  composeParentId: null,
  hiddenNodeIds: new Set<string>(),
  previewRestoreIds: new Set<string>(),
  collapsedNodeIds: new Set<string>(),

  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  setSettingsOpen: (open) => set({ settingsOpen: open }),
  setLayoutMode: (mode) => set({ layoutMode: mode }),
  setComposeParentId: (id) => set({ composeParentId: id }),
  hideNode: (id) =>
    set((s) => {
      const next = new Set(s.hiddenNodeIds);
      next.add(id);
      return { hiddenNodeIds: next };
    }),
  restoreNode: (id) =>
    set((s) => {
      const next = new Set(s.hiddenNodeIds);
      next.delete(id);
      return { hiddenNodeIds: next };
    }),
  restoreAllNodes: () => set({ hiddenNodeIds: new Set() }),
  setPreviewRestoreIds: (ids) => set({ previewRestoreIds: ids }),
  toggleCollapse: (id) =>
    set((s) => {
      const next = new Set(s.collapsedNodeIds);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return { collapsedNodeIds: next };
    }),
  };
});
