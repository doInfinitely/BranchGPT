"use client";

import { useCallback, useState } from "react";
import { useUIStore } from "@/stores/uiStore";
import { getConnectedHiddenBranch } from "@/lib/graph";
import type { MessageNode, NodeId } from "@/types";

interface HiddenNodesPanelProps {
  nodes: Record<NodeId, MessageNode>;
}

export function HiddenNodesPanel({ nodes }: HiddenNodesPanelProps) {
  const [open, setOpen] = useState(false);
  const hiddenNodeIds = useUIStore((s) => s.hiddenNodeIds);
  const restoreNode = useUIStore((s) => s.restoreNode);
  const restoreAllNodes = useUIStore((s) => s.restoreAllNodes);
  const setPreviewRestoreIds = useUIStore((s) => s.setPreviewRestoreIds);
  const previewRestoreIds = useUIStore((s) => s.previewRestoreIds);

  const hiddenNodes = Array.from(hiddenNodeIds)
    .map((id) => nodes[id])
    .filter(Boolean)
    .sort((a, b) => a.createdAt - b.createdAt);

  const handleHover = useCallback(
    (nodeId: string) => {
      const branch = getConnectedHiddenBranch(nodeId, nodes, hiddenNodeIds);
      setPreviewRestoreIds(branch);
    },
    [nodes, hiddenNodeIds, setPreviewRestoreIds]
  );

  const handleHoverEnd = useCallback(() => {
    setPreviewRestoreIds(new Set());
  }, [setPreviewRestoreIds]);

  const handleRestore = useCallback(
    (nodeId: string) => {
      // Restore the full connected branch
      const branch = getConnectedHiddenBranch(nodeId, nodes, hiddenNodeIds);
      for (const id of branch) restoreNode(id);
      setPreviewRestoreIds(new Set());
    },
    [nodes, hiddenNodeIds, restoreNode, setPreviewRestoreIds]
  );

  if (hiddenNodes.length === 0) return null;

  return (
    <div className="absolute top-3 right-3 z-10">
      <button
        onClick={() => setOpen(!open)}
        className="rounded-lg px-2.5 py-1.5 text-[10px] font-medium shadow-sm cursor-pointer flex items-center gap-1.5"
        style={{
          backgroundColor: "var(--color-bg)",
          border: "1px solid var(--color-border)",
          color: "var(--color-text-secondary)",
        }}
      >
        <span
          className="inline-flex items-center justify-center rounded-full text-[9px] font-bold text-white"
          style={{
            backgroundColor: "var(--color-text-tertiary)",
            width: 16,
            height: 16,
          }}
        >
          {hiddenNodes.length}
        </span>
        Hidden
        <span className="text-[8px]">{open ? "\u25B2" : "\u25BC"}</span>
      </button>

      {open && (
        <div
          className="mt-1 rounded-lg shadow-lg overflow-hidden"
          style={{
            backgroundColor: "var(--color-bg)",
            border: "1px solid var(--color-border)",
            maxHeight: 300,
            width: 260,
          }}
        >
          <div
            className="flex items-center justify-between px-2.5 py-1.5 border-b"
            style={{ borderColor: "var(--color-border)" }}
          >
            <span
              className="text-[9px] font-semibold uppercase tracking-wide"
              style={{ color: "var(--color-text-tertiary)" }}
            >
              Hidden nodes
            </span>
            <button
              onClick={() => {
                restoreAllNodes();
                setPreviewRestoreIds(new Set());
              }}
              className="text-[9px] font-medium cursor-pointer hover:underline"
              style={{ color: "var(--color-accent)" }}
            >
              Restore all
            </button>
          </div>
          <div
            className="overflow-y-auto"
            style={{ maxHeight: 260 }}
            onMouseLeave={handleHoverEnd}
          >
            {hiddenNodes.map((node) => {
              const isHighlighted = previewRestoreIds.has(node.id);
              return (
                <div
                  key={node.id}
                  className="flex items-center justify-between px-2.5 py-1.5 border-b last:border-b-0 transition-colors"
                  style={{
                    borderColor: "var(--color-border)",
                    backgroundColor: isHighlighted
                      ? "var(--color-accent-light)"
                      : "transparent",
                  }}
                  onMouseEnter={() => handleHover(node.id)}
                >
                  <div className="flex-1 min-w-0 mr-2">
                    <div className="flex items-center gap-1.5">
                      <span
                        className="text-[8px] font-semibold uppercase"
                        style={{ color: "var(--color-text-tertiary)" }}
                      >
                        {node.role}
                      </span>
                      {node.status === "error" && (
                        <span
                          className="text-[7px] px-1 rounded"
                          style={{
                            backgroundColor: "var(--color-error)",
                            color: "white",
                          }}
                        >
                          error
                        </span>
                      )}
                      {node.status === "pending" && (
                        <span
                          className="text-[7px] px-1 rounded"
                          style={{
                            backgroundColor: "var(--color-text-tertiary)",
                            color: "white",
                          }}
                        >
                          pending
                        </span>
                      )}
                    </div>
                    <div
                      className="text-[10px] truncate"
                      style={{ color: "var(--color-text-secondary)" }}
                    >
                      {node.content.slice(0, 50) || "(empty)"}
                      {node.content.length > 50 ? "..." : ""}
                    </div>
                  </div>
                  <button
                    onClick={() => handleRestore(node.id)}
                    className="text-[9px] font-medium cursor-pointer shrink-0 hover:underline"
                    style={{ color: "var(--color-accent)" }}
                  >
                    Restore
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
