"use client";

import { useState, useRef, useCallback } from "react";
import { useConversationStore } from "@/stores/conversationStore";
import { useSettingsStore } from "@/stores/settingsStore";
import { useUIStore } from "@/stores/uiStore";
import { useSelectionStore } from "@/stores/selectionStore";
import { streamChat, buildMessagesFromChain } from "@/lib/api";
import { Button } from "@/components/ui";

export function ComposePanel() {
  const [text, setText] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [quotaError, setQuotaError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

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
  const keyMode = useSettingsStore((s) => s.keyMode);

  const composeParentId = useUIStore((s) => s.composeParentId);
  const setComposeParentId = useUIStore((s) => s.setComposeParentId);
  const selectNode = useSelectionStore((s) => s.selectNode);

  const apiKey = provider === "openai" ? openaiKey : anthropicKey;
  const needsKey = keyMode === "byok" && !apiKey;

  const handleSend = useCallback(async () => {
    if (!text.trim() || isSending) return;
    if (needsKey) {
      alert("Please set your API key in Settings first.");
      return;
    }

    setIsSending(true);
    setQuotaError(null);
    const messageText = text.trim();
    setText("");

    let convId = activeConversationId;
    if (!convId) {
      convId = createConversation(provider, model);
    }

    // Add user message
    const userNodeId = addUserMessage(
      convId,
      composeParentId,
      messageText,
      provider,
      model
    );

    // Add streaming assistant node
    const assistantNodeId = addAssistantNode(convId, userNodeId, provider, model);
    selectNode(assistantNodeId);

    // Build messages from ancestor chain
    const chain = getAncestorChain(userNodeId);
    const messages = buildMessagesFromChain(chain, generationParams.systemPrompt);

    // Auto-title: if this is the first message, set conversation title
    const convNodes = Object.values(nodes).filter(
      (n) => n.conversationId === convId
    );
    if (convNodes.length <= 1) {
      const title = messageText.slice(0, 50) + (messageText.length > 50 ? "..." : "");
      updateConversationTitle(convId!, title);
    }

    const abortController = new AbortController();
    abortRef.current = abortController;

    await streamChat({
      messages,
      model,
      provider,
      generationParams,
      apiKey,
      keyMode,
      signal: abortController.signal,
      onReasoning: (chunk) => appendReasoning(assistantNodeId, chunk),
      onChunk: (chunk) => {
        appendToNode(assistantNodeId, chunk);
      },
      onDone: () => {
        setNodeStatus(assistantNodeId, "complete");
        persistNode(assistantNodeId);
        persistNode(userNodeId);
        setComposeParentId(assistantNodeId);
      },
      onError: (error) => {
        // Check for quota/throttle errors
        if (error.includes("402") || error.includes("Free tier limit") || error.includes("429") || error.includes("Anonymous limit")) {
          setQuotaError(error);
        }
        setNodeStatus(assistantNodeId, "error");
        appendToNode(assistantNodeId, `\n\nError: ${error}`);
        persistNode(assistantNodeId);
      },
    });

    setIsSending(false);
    abortRef.current = null;
  }, [
    text, isSending, needsKey, apiKey, keyMode, activeConversationId, composeParentId,
    provider, model, generationParams, nodes,
    createConversation, addUserMessage, addAssistantNode, appendToNode,
    setNodeStatus, persistNode, getAncestorChain, selectNode,
    setComposeParentId, updateConversationTitle,
  ]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleAbort = () => {
    abortRef.current?.abort();
    setIsSending(false);
  };

  const parentNode = composeParentId ? nodes[composeParentId] : null;

  return (
    <div
      className="border-t px-4 py-3 flex flex-col gap-2"
      style={{
        borderColor: "var(--color-border)",
        backgroundColor: "var(--color-compose)",
      }}
    >
      {/* Quota / throttle banner */}
      {quotaError && (
        <div
          className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg text-xs"
          style={{
            backgroundColor: "var(--color-accent-light)",
            color: "var(--color-accent)",
            border: "1px solid var(--color-accent)",
          }}
        >
          <span>
            {quotaError.includes("Anonymous")
              ? "You've used all free anonymous messages. Sign up or add your own API key in Settings to continue."
              : quotaError.includes("Free tier")
                ? "Free tier limit reached. Add a payment method in Settings or switch to your own API key (BYOK) for unlimited use."
                : quotaError}
          </span>
          <button
            onClick={() => setQuotaError(null)}
            className="shrink-0 font-bold cursor-pointer"
          >
            &times;
          </button>
        </div>
      )}

      {/* Managed mode info banner (only when no BYOK key is set) */}
      {keyMode === "managed" && (
        <div
          className="text-[10px] px-2 py-1 rounded"
          style={{ color: "var(--color-text-tertiary)", backgroundColor: "var(--color-bg-secondary)" }}
        >
          Using managed API keys (5 free messages, then pay-as-you-go). Switch to &quot;Bring your own key&quot; in Settings for unlimited free use.
        </div>
      )}

      {parentNode && (
        <div className="flex items-center gap-2 text-[10px]" style={{ color: "var(--color-text-tertiary)" }}>
          <span>Replying to:</span>
          <span className="truncate max-w-[300px] italic">
            {parentNode.content.slice(0, 80)}...
          </span>
          <button
            onClick={() => setComposeParentId(null)}
            className="text-[var(--color-text-tertiary)] hover:text-[var(--color-text)] cursor-pointer"
          >
            &times;
          </button>
        </div>
      )}

      <div className="flex gap-2 items-end">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={
            needsKey
              ? "Set your API key in Settings to start chatting"
              : "Type your message... (Enter to send, Shift+Enter for newline)"
          }
          rows={2}
          className="flex-1 resize-none rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2"
          style={{
            borderColor: "var(--color-border)",
            backgroundColor: "var(--color-bg)",
            color: "var(--color-text)",
            // @ts-expect-error CSS custom property
            "--tw-ring-color": "var(--color-accent)",
          }}
          disabled={isSending}
        />
        {isSending ? (
          <Button variant="danger" size="md" onClick={handleAbort}>
            Stop
          </Button>
        ) : (
          <Button
            variant="primary"
            size="md"
            onClick={handleSend}
            disabled={!text.trim() || needsKey}
          >
            Send
          </Button>
        )}
      </div>
    </div>
  );
}
