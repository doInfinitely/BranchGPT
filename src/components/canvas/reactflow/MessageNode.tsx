"use client";

import { memo, useCallback } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import type { FlowMessageNode } from "@/types";
import { useUIStore } from "@/stores/uiStore";
import { MarkdownContent } from "@/components/ui/MarkdownContent";

function MessageNodeComponent({ data }: NodeProps<FlowMessageNode>) {
  const { message, isSelected, isOnActivePath, isContextNode, isCollapsed, onBranch, onToggleCollapse } = data;
  const setFocusedNodeId = useUIStore((s) => s.setFocusedNodeId);
  const isUser = message.role === "user";
  const isStreaming = message.status === "streaming";
  const isError = message.status === "error";

  const handleDoubleClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      setFocusedNodeId(message.id);
    },
    [message.id, setFocusedNodeId]
  );

  const bgColor = isUser
    ? "var(--color-node-user)"
    : "var(--color-node-assistant)";
  const textColor = isUser
    ? "var(--color-node-user-text)"
    : "var(--color-node-assistant-text)";

  const truncatedContent = message.content.length > 60
    ? message.content.slice(0, 60) + "..."
    : message.content;

  return (
    <div
      onDoubleClick={handleDoubleClick}
      className="relative rounded-xl px-3 py-2 shadow-sm transition-all"
      style={{
        backgroundColor: bgColor,
        color: textColor,
        width: 300,
        minHeight: isCollapsed ? 32 : 60,
        border: isSelected
          ? "2px solid var(--color-accent)"
          : isContextNode
            ? "2px dashed var(--color-accent)"
            : "1px solid var(--color-border)",
        opacity: isOnActivePath || isSelected || isContextNode ? 1 : 0.7,
      }}
    >
      <Handle
        type="target"
        position={Position.Top}
        className="!bg-[var(--color-accent)] !w-2 !h-2 !border-none"
      />

      {/* Header */}
      <div className="flex items-center justify-between mb-0.5">
        <div className="flex items-center gap-1.5">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleCollapse?.(message.id);
            }}
            className="text-[10px] opacity-50 hover:opacity-100 transition-opacity cursor-pointer select-none nodrag nopan"
            title={isCollapsed ? "Expand" : "Collapse"}
          >
            {isCollapsed ? "\u25B6" : "\u25BC"}
          </button>
          <span className="text-[10px] font-semibold uppercase tracking-wide opacity-60">
            {message.role}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <span
            className="text-[8px] px-1.5 py-0.5 rounded-full"
            style={{
              backgroundColor: "var(--color-bg-tertiary)",
              color: "var(--color-text-secondary)",
            }}
          >
            {message.model}
          </span>
          {isStreaming && (
            <span
              className="inline-block w-1.5 h-1.5 rounded-full animate-pulse"
              style={{ backgroundColor: "var(--color-streaming)" }}
            />
          )}
        </div>
      </div>

      {isCollapsed ? (
        /* Collapsed: single line preview */
        <div className="text-[10px] leading-tight opacity-50 truncate">
          {truncatedContent || (isStreaming ? "..." : "")}
        </div>
      ) : (
        <>
          {/* Attachment thumbnails */}
          {message.attachments.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-1">
              {message.attachments.map((att) => (
                <div
                  key={att.id}
                  className="rounded border overflow-hidden"
                  style={{
                    borderColor: "var(--color-border)",
                    width: 36,
                    height: 36,
                  }}
                >
                  {att.mimeType.startsWith("image/") ? (
                    <img
                      src={`data:${att.mimeType};base64,${att.data}`}
                      alt={att.fileName}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div
                      className="w-full h-full flex items-center justify-center text-[7px]"
                      style={{
                        backgroundColor: "var(--color-bg-tertiary)",
                        color: "var(--color-text-secondary)",
                      }}
                    >
                      {att.fileName.split(".").pop()?.toUpperCase()}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Reasoning (collapsible) */}
          {message.reasoning && (
            <details className="mb-1 nowheel nopan nodrag">
              <summary
                className="text-[9px] cursor-pointer select-none"
                style={{ color: "var(--color-text-tertiary)" }}
              >
                Reasoning ({Math.ceil(message.reasoning.length / 4)} tokens)
              </summary>
              <div
                className="mt-0.5 max-h-[150px] overflow-y-auto rounded border px-2 py-1 text-[10px] leading-relaxed whitespace-pre-wrap break-words"
                style={{
                  borderColor: "var(--color-border)",
                  backgroundColor: "var(--color-bg-tertiary)",
                  color: "var(--color-text-secondary)",
                }}
              >
                {message.reasoning}
              </div>
            </details>
          )}

          {/* Content */}
          <div className="text-xs leading-relaxed break-words max-h-[300px] overflow-y-auto nowheel prose-node">
            {message.content ? (
              <MarkdownContent content={message.content} />
            ) : (
              isStreaming ? "..." : ""
            )}
            {isError && (
              <span className="text-[var(--color-error)]"> (Error)</span>
            )}
          </div>
        </>
      )}

      {/* Branch button for assistant nodes */}
      {!isUser && message.status === "complete" && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onBranch(message.id);
          }}
          className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-[var(--color-accent)] text-white text-[9px] px-2 py-0.5 rounded-full opacity-0 hover:opacity-100 transition-opacity cursor-pointer shadow-sm"
          title="Branch from here"
        >
          + Branch
        </button>
      )}

      <Handle
        type="source"
        position={Position.Bottom}
        className="!bg-[var(--color-accent)] !w-2 !h-2 !border-none"
      />
    </div>
  );
}

export const MessageNodeMemo = memo(MessageNodeComponent);
