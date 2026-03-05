"use client";

import { useUIStore } from "@/stores/uiStore";
import { ReactFlowCanvas } from "./reactflow/ReactFlowCanvas";
import { D3ForceCanvas } from "./d3force/D3ForceCanvas";

export function GraphCanvas() {
  const layoutMode = useUIStore((s) => s.layoutMode);

  if (layoutMode === "d3force") {
    return <D3ForceCanvas />;
  }

  return <ReactFlowCanvas />;
}
