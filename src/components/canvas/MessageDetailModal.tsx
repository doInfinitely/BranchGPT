"use client";

import { useEffect, useRef } from "react";
import { useConversationStore } from "@/stores/conversationStore";
import { useUIStore } from "@/stores/uiStore";
import { MarkdownContent } from "@/components/ui/MarkdownContent";

export function MessageDetailModal() {
  const focusedNodeId = useUIStore((s) => s.focusedNodeId);
  const setFocusedNodeId = useUIStore((s) => s.setFocusedNodeId);
  const nodes = useConversationStore((s) => s.nodes);
  const overlayRef = useRef<HTMLDivElement>(null);

  const node = focusedNodeId ? nodes[focusedNodeId] : null;

  useEffect(() => {
    if (!node) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setFocusedNodeId(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [node, setFocusedNodeId]);

  if (!node) return null;

  const isUser = node.role === "user";

  return (
    <div
      ref={overlayRef}
      onClick={(e) => e.target === overlayRef.current && setFocusedNodeId(null)}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
    >
      <div
        className="flex flex-col rounded-2xl shadow-2xl w-full max-w-3xl max-h-[85vh] overflow-hidden"
        style={{
          backgroundColor: "var(--color-bg)",
          border: "1px solid var(--color-border)",
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-6 py-4 border-b"
          style={{ borderColor: "var(--color-border)" }}
        >
          <div className="flex items-center gap-3">
            <span
              className="text-xs font-semibold uppercase tracking-wide px-2 py-0.5 rounded"
              style={{
                backgroundColor: isUser
                  ? "var(--color-node-user)"
                  : "var(--color-node-assistant)",
                color: isUser
                  ? "var(--color-node-user-text)"
                  : "var(--color-node-assistant-text)",
              }}
            >
              {node.role}
            </span>
            <span
              className="text-xs"
              style={{ color: "var(--color-text-secondary)" }}
            >
              {node.model}
            </span>
            <span
              className="text-[10px]"
              style={{ color: "var(--color-text-tertiary)" }}
            >
              {new Date(node.createdAt).toLocaleString()}
            </span>
          </div>
          <button
            onClick={() => setFocusedNodeId(null)}
            className="p-1 cursor-pointer"
            style={{ color: "var(--color-text-secondary)" }}
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {/* Reasoning (collapsible) */}
          {node.reasoning && (
            <details className="mb-4">
              <summary
                className="text-xs font-medium cursor-pointer select-none mb-1"
                style={{ color: "var(--color-text-tertiary)" }}
              >
                Reasoning (~{Math.ceil(node.reasoning.length / 4)} tokens)
              </summary>
              <div
                className="rounded-lg border px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap break-words"
                style={{
                  borderColor: "var(--color-border)",
                  backgroundColor: "var(--color-bg-tertiary)",
                  color: "var(--color-text-secondary)",
                }}
              >
                {node.reasoning}
              </div>
            </details>
          )}

          {/* Attachments */}
          {node.attachments.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-4">
              {node.attachments.map((att) => (
                <div
                  key={att.id}
                  className="rounded-lg border overflow-hidden"
                  style={{ borderColor: "var(--color-border)" }}
                >
                  {att.mimeType.startsWith("image/") ? (
                    <img
                      src={`data:${att.mimeType};base64,${att.data}`}
                      alt={att.fileName}
                      className="max-h-48 object-contain"
                    />
                  ) : (
                    <div
                      className="px-3 py-2 text-xs"
                      style={{
                        backgroundColor: "var(--color-bg-tertiary)",
                        color: "var(--color-text-secondary)",
                      }}
                    >
                      {att.fileName}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Content */}
          <div
            className="prose-detail"
            style={{ color: "var(--color-text)" }}
          >
            <MarkdownContent content={node.content} />
          </div>
        </div>
      </div>
    </div>
  );
}
