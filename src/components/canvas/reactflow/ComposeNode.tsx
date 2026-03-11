"use client";

import { memo, useState, useRef, useCallback, useMemo } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import type { FlowComposeNode } from "@/types";
import { useConversationStore } from "@/stores/conversationStore";
import { useSettingsStore } from "@/stores/settingsStore";
import { useUIStore } from "@/stores/uiStore";
import { useSelectionStore } from "@/stores/selectionStore";
import { streamChat, buildMessagesFromChain } from "@/lib/api";
import { gatherContextNodes } from "@/lib/graph";
import { FileUploadZone } from "@/components/compose/FileUploadZone";
import type { Attachment } from "@/types";

interface BranchInput {
  id: string;
  text: string;
  attachments: Attachment[];
}

function ComposeNodeComponent({ data }: NodeProps<FlowComposeNode>) {
  const [sharedPrefix, setSharedPrefix] = useState("");
  const [branches, setBranches] = useState<BranchInput[]>([
    { id: "1", text: "", attachments: [] },
  ]);
  const [sharedAttachments, setSharedAttachments] = useState<Attachment[]>([]);
  const [sendingIds, setSendingIds] = useState<Set<string>>(new Set());
  const abortRefs = useRef<Map<string, AbortController>>(new Map());

  const activeConversationId = useConversationStore((s) => s.activeConversationId);
  const addUserMessage = useConversationStore((s) => s.addUserMessage);
  const addAssistantNode = useConversationStore((s) => s.addAssistantNode);
  const appendToNode = useConversationStore((s) => s.appendToNode);
  const appendReasoning = useConversationStore((s) => s.appendReasoning);
  const setNodeStatus = useConversationStore((s) => s.setNodeStatus);
  const persistNode = useConversationStore((s) => s.persistNode);
  const getAncestorChain = useConversationStore((s) => s.getAncestorChain);
  const createConversation = useConversationStore((s) => s.createConversation);
  const updateConversationTitle = useConversationStore((s) => s.updateConversationTitle);
  const nodes = useConversationStore((s) => s.nodes);

  const provider = useSettingsStore((s) => s.activeProvider);
  const model = useSettingsStore((s) => s.activeModel);
  const generationParams = useSettingsStore((s) => s.generationParams);
  const openaiKey = useSettingsStore((s) => s.openaiApiKey);
  const anthropicKey = useSettingsStore((s) => s.anthropicApiKey);

  const setComposeParentId = useUIStore((s) => s.setComposeParentId);
  const selectNode = useSelectionStore((s) => s.selectNode);
  const clearSelection = useSelectionStore((s) => s.clearSelection);

  const apiKey = provider === "openai" ? openaiKey : anthropicKey;
  const parentNodeId = data.parentNodeId;
  const selectedNodeIds = data.selectedNodeIds ?? [];
  const isSending = sendingIds.size > 0;

  // Multi-select mode: more than 1 node selected
  const isMultiContext = selectedNodeIds.length > 1;

  // Compute gathered context for display
  const contextNodes = useMemo(() => {
    if (!isMultiContext) return [];
    return gatherContextNodes(selectedNodeIds, nodes);
  }, [isMultiContext, selectedNodeIds, nodes]);

  // Rough token estimate (~4 chars per token)
  const estimatedTokens = useMemo(() => {
    if (contextNodes.length === 0) return 0;
    const totalChars = contextNodes.reduce((sum, n) => sum + n.content.length, 0);
    return Math.ceil(totalChars / 4);
  }, [contextNodes]);

  const sendBranch = useCallback(
    async (branchText: string, branchId: string, convId: string) => {
      const fullText = sharedPrefix
        ? `${sharedPrefix}\n${branchText}`.trim()
        : branchText.trim();

      if (!fullText) return;

      // In multi-select mode, attach the new user message to the most recent selected node
      // but send the gathered context from ALL selected nodes' ancestors
      const attachParent = isMultiContext
        ? selectedNodeIds[selectedNodeIds.length - 1]
        : parentNodeId;

      const userNodeId = addUserMessage(convId, attachParent, fullText, provider, model);
      const assistantNodeId = addAssistantNode(convId, userNodeId, provider, model);

      // Build messages: multi-select uses gathered context, single uses ancestor chain
      let messages;
      if (isMultiContext) {
        // Gather context from all selected nodes, then append the new user message
        const gathered = gatherContextNodes(selectedNodeIds, nodes);
        const contextWithUser = [...gathered, nodes[userNodeId]];
        messages = buildMessagesFromChain(contextWithUser, generationParams.systemPrompt, provider);
      } else {
        const chain = getAncestorChain(userNodeId);
        messages = buildMessagesFromChain(chain, generationParams.systemPrompt, provider);
      }

      const abortController = new AbortController();
      abortRefs.current.set(branchId, abortController);
      setSendingIds((prev) => new Set([...prev, branchId]));

      await streamChat({
        messages,
        model,
        provider,
        generationParams,
        apiKey,
        signal: abortController.signal,
        onReasoning: (chunk) => appendReasoning(assistantNodeId, chunk),
        onChunk: (chunk) => appendToNode(assistantNodeId, chunk),
        onDone: () => {
          setNodeStatus(assistantNodeId, "complete");
          persistNode(assistantNodeId);
          persistNode(userNodeId);
          if (branches.length === 1) {
            setComposeParentId(assistantNodeId);
            clearSelection();
          }
        },
        onError: (error) => {
          setNodeStatus(assistantNodeId, "error");
          appendToNode(assistantNodeId, `\n\nError: ${error}`);
          persistNode(assistantNodeId);
        },
      });

      abortRefs.current.delete(branchId);
      setSendingIds((prev) => {
        const next = new Set(prev);
        next.delete(branchId);
        return next;
      });
    },
    [
      sharedPrefix, parentNodeId, isMultiContext, selectedNodeIds, nodes,
      provider, model, generationParams, apiKey,
      branches.length, addUserMessage, addAssistantNode, appendToNode,
      setNodeStatus, persistNode, getAncestorChain, setComposeParentId, clearSelection,
    ]
  );

  const handleSendAll = useCallback(async () => {
    if (!apiKey) {
      alert("Please set your API key in Settings first.");
      return;
    }

    let convId = activeConversationId;
    if (!convId) {
      convId = createConversation(provider, model);
    }

    // Auto-title
    const convNodes = Object.values(nodes).filter((n) => n.conversationId === convId);
    if (convNodes.length === 0) {
      const firstText = sharedPrefix || branches[0]?.text || "";
      const title = firstText.slice(0, 50) + (firstText.length > 50 ? "..." : "");
      if (title) updateConversationTitle(convId!, title);
    }

    const activeBranches = branches.filter((b) => b.text.trim() || sharedPrefix.trim());
    if (activeBranches.length === 0) return;

    const finalConvId = convId!;

    // Clear input immediately so the compose node doesn't duplicate the new user node
    setSharedPrefix("");
    setBranches([{ id: String(Date.now()), text: "", attachments: [] }]);
    setSharedAttachments([]);

    await Promise.all(
      activeBranches.map((b) => sendBranch(b.text, b.id, finalConvId))
    );
  }, [
    apiKey, activeConversationId, branches, sharedPrefix, nodes,
    provider, model, createConversation, updateConversationTitle, sendBranch,
  ]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendAll();
    }
  };

  const addBranch = () => {
    setBranches((prev) => [...prev, { id: String(Date.now()), text: "", attachments: [] }]);
  };

  const removeBranch = (id: string) => {
    if (branches.length <= 1) return;
    setBranches((prev) => prev.filter((b) => b.id !== id));
  };

  const updateBranchText = (id: string, text: string) => {
    setBranches((prev) => prev.map((b) => (b.id === id ? { ...b, text } : b)));
  };

  const updateBranchAttachments = (id: string, attachments: Attachment[]) => {
    setBranches((prev) =>
      prev.map((b) => (b.id === id ? { ...b, attachments: [...b.attachments, ...attachments] } : b))
    );
  };

  const removeBranchAttachment = (branchId: string, attachmentId: string) => {
    setBranches((prev) =>
      prev.map((b) =>
        b.id === branchId
          ? { ...b, attachments: b.attachments.filter((a) => a.id !== attachmentId) }
          : b
      )
    );
  };

  const handleAbortAll = () => {
    for (const [, ctrl] of abortRefs.current) {
      ctrl.abort();
    }
    setSendingIds(new Set());
  };

  const hasContent = sharedPrefix.trim() || branches.some((b) => b.text.trim());

  return (
    <div
      className="rounded-xl shadow-lg"
      style={{
        backgroundColor: "var(--color-compose)",
        border: isMultiContext
          ? "2px dashed var(--color-accent)"
          : "2px solid var(--color-accent)",
        width: 360,
        padding: 14,
      }}
    >
      {(parentNodeId || isMultiContext) && (
        <Handle
          type="target"
          position={Position.Top}
          className="!bg-[var(--color-accent)] !w-2 !h-2 !border-none"
        />
      )}

      <div className="flex flex-col gap-2">
        {/* Header */}
        <div className="flex items-center justify-between">
          <span
            className="text-[10px] font-semibold uppercase tracking-wide"
            style={{ color: "var(--color-text-secondary)" }}
          >
            {isMultiContext
              ? "Multi-context reply"
              : parentNodeId
                ? "Reply"
                : "New message"}
          </span>
          <span className="text-[9px]" style={{ color: "var(--color-text-tertiary)" }}>
            {model}
          </span>
        </div>

        {/* Multi-context info bar */}
        {isMultiContext && (
          <div
            className="rounded-lg px-2.5 py-1.5 flex items-center justify-between text-[9px]"
            style={{
              backgroundColor: "var(--color-accent-light)",
              color: "var(--color-accent)",
            }}
          >
            <span>
              <strong>{selectedNodeIds.length}</strong> nodes selected
              {" / "}
              <strong>{contextNodes.length}</strong> in context
              {" / ~"}
              <strong>{estimatedTokens.toLocaleString()}</strong> tokens
            </span>
            <button
              onClick={clearSelection}
              className="nodrag nopan nowheel cursor-pointer font-medium hover:underline"
            >
              Clear
            </button>
          </div>
        )}

        {/* Context preview (collapsed) */}
        {isMultiContext && contextNodes.length > 0 && (
          <details className="nowheel nopan nodrag">
            <summary
              className="text-[9px] cursor-pointer select-none"
              style={{ color: "var(--color-text-tertiary)" }}
            >
              Preview context ({contextNodes.length} messages)
            </summary>
            <div
              className="mt-1 max-h-[120px] overflow-y-auto rounded border px-2 py-1 text-[9px] leading-relaxed"
              style={{
                borderColor: "var(--color-border)",
                backgroundColor: "var(--color-bg-secondary)",
                color: "var(--color-text-secondary)",
              }}
            >
              {contextNodes.map((n) => (
                <div key={n.id} className="mb-1">
                  <span className="font-semibold uppercase opacity-60">{n.role}: </span>
                  {n.content.slice(0, 100)}{n.content.length > 100 ? "..." : ""}
                </div>
              ))}
            </div>
          </details>
        )}

        {/* Shared Prefix */}
        {branches.length > 1 && (
          <div className="flex flex-col gap-1">
            <label
              className="text-[9px] font-medium uppercase tracking-wide"
              style={{ color: "var(--color-text-tertiary)" }}
            >
              Shared prefix
            </label>
            <textarea
              value={sharedPrefix}
              onChange={(e) => setSharedPrefix(e.target.value)}
              placeholder="Common beginning for all branches..."
              rows={2}
              disabled={isSending}
              className="nowheel nopan nodrag resize-none rounded-lg border px-2.5 py-1.5 text-xs leading-relaxed focus:outline-none focus:ring-2"
              style={{
                borderColor: "var(--color-accent)",
                backgroundColor: "var(--color-bg)",
                color: "var(--color-text)",
                borderStyle: "dashed",
              }}
            />
          </div>
        )}

        {/* Shared Attachments */}
        {branches.length > 1 && (
          <FileUploadZone
            attachments={sharedAttachments}
            onAttach={(files) => setSharedAttachments((prev) => [...prev, ...files])}
            onRemove={(id) => setSharedAttachments((prev) => prev.filter((a) => a.id !== id))}
            label="Shared files"
            compact
          />
        )}

        {/* Branch Textboxes */}
        <div className="flex flex-col gap-2">
          {branches.map((branch, i) => (
            <div key={branch.id} className="flex flex-col gap-1">
              {branches.length > 1 && (
                <div className="flex items-center justify-between">
                  <span
                    className="text-[9px] font-medium"
                    style={{ color: "var(--color-text-tertiary)" }}
                  >
                    Branch {i + 1}
                  </span>
                  <button
                    onClick={() => removeBranch(branch.id)}
                    className="nodrag nopan nowheel text-[9px] cursor-pointer"
                    style={{ color: "var(--color-text-tertiary)" }}
                  >
                    &times;
                  </button>
                </div>
              )}
              <textarea
                value={branch.text}
                onChange={(e) => updateBranchText(branch.id, e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={
                  apiKey
                    ? branches.length > 1
                      ? "Variable ending..."
                      : "Type a message... (Enter to send)"
                    : "Set API key in Settings first"
                }
                rows={branches.length > 1 ? 2 : 3}
                disabled={sendingIds.has(branch.id)}
                className="nowheel nopan nodrag resize-none rounded-lg border px-2.5 py-2 text-xs leading-relaxed focus:outline-none focus:ring-2"
                style={{
                  borderColor: "var(--color-border)",
                  backgroundColor: "var(--color-bg)",
                  color: "var(--color-text)",
                }}
              />
              {/* Per-branch attachments */}
              <FileUploadZone
                attachments={branch.attachments}
                onAttach={(files) => updateBranchAttachments(branch.id, files)}
                onRemove={(id) => removeBranchAttachment(branch.id, id)}
                compact
              />
              {sendingIds.has(branch.id) && (
                <span
                  className="text-[9px] animate-pulse"
                  style={{ color: "var(--color-streaming)" }}
                >
                  Streaming...
                </span>
              )}
            </div>
          ))}
        </div>

        {/* Action buttons */}
        <div className="flex items-center justify-between gap-2">
          <button
            onClick={addBranch}
            disabled={isSending}
            className="nodrag nopan nowheel cursor-pointer rounded-lg px-2 py-1 text-[10px] font-medium transition-colors disabled:opacity-40"
            style={{
              color: "var(--color-accent)",
              border: "1px dashed var(--color-accent)",
              backgroundColor: "transparent",
            }}
          >
            + Branch
          </button>

          <div className="flex gap-2">
            {isSending ? (
              <button
                onClick={handleAbortAll}
                className="nodrag nopan nowheel cursor-pointer rounded-lg px-3 py-1.5 text-[11px] font-medium text-white"
                style={{ backgroundColor: "var(--color-error)" }}
              >
                Stop All
              </button>
            ) : (
              <button
                onClick={handleSendAll}
                disabled={!hasContent || !apiKey}
                className="nodrag nopan nowheel cursor-pointer rounded-lg px-3 py-1.5 text-[11px] font-medium text-white disabled:opacity-40 disabled:cursor-not-allowed"
                style={{ backgroundColor: "var(--color-accent)" }}
              >
                {branches.length > 1 ? "Send All" : "Send"}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export const ComposeNodeMemo = memo(ComposeNodeComponent);
