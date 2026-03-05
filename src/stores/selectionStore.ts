import { create } from "zustand";
import type { NodeId } from "@/types";

interface SelectionState {
  selectedNodeIds: Set<NodeId>;
  toggleNode: (id: NodeId) => void;
  selectNode: (id: NodeId) => void;
  clearSelection: () => void;
  setSelection: (ids: NodeId[]) => void;
}

export const useSelectionStore = create<SelectionState>()((set) => ({
  selectedNodeIds: new Set<NodeId>(),

  toggleNode: (id) =>
    set((state) => {
      const next = new Set(state.selectedNodeIds);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return { selectedNodeIds: next };
    }),

  selectNode: (id) => set({ selectedNodeIds: new Set([id]) }),

  clearSelection: () => set({ selectedNodeIds: new Set() }),

  setSelection: (ids) => set({ selectedNodeIds: new Set(ids) }),
}));
