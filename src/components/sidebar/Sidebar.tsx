"use client";

import { useEffect } from "react";
import { useConversationStore } from "@/stores/conversationStore";
import { useSettingsStore } from "@/stores/settingsStore";
import { useUIStore } from "@/stores/uiStore";
import { Button } from "@/components/ui";

export function Sidebar() {
  const sidebarOpen = useUIStore((s) => s.sidebarOpen);
  const toggleSidebar = useUIStore((s) => s.toggleSidebar);
  const setSettingsOpen = useUIStore((s) => s.setSettingsOpen);
  const setComposeParentId = useUIStore((s) => s.setComposeParentId);

  const conversations = useConversationStore((s) => s.conversations);
  const activeConversationId = useConversationStore((s) => s.activeConversationId);
  const loadConversations = useConversationStore((s) => s.loadConversations);
  const loadConversation = useConversationStore((s) => s.loadConversation);
  const createConversation = useConversationStore((s) => s.createConversation);
  const deleteConversation = useConversationStore((s) => s.deleteConversation);

  const provider = useSettingsStore((s) => s.activeProvider);
  const model = useSettingsStore((s) => s.activeModel);

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  const sortedConvs = Object.values(conversations).sort(
    (a, b) => b.updatedAt - a.updatedAt
  );

  const handleNewChat = () => {
    createConversation(provider, model);
    setComposeParentId(null);
  };

  const handleSelectConv = (id: string) => {
    loadConversation(id);
    setComposeParentId(null);
  };

  if (!sidebarOpen) {
    return (
      <div
        className="w-10 border-r flex flex-col items-center pt-3 gap-2"
        style={{
          borderColor: "var(--color-border)",
          backgroundColor: "var(--color-sidebar)",
        }}
      >
        <button
          onClick={toggleSidebar}
          className="text-[var(--color-text-secondary)] hover:text-[var(--color-text)] text-sm cursor-pointer"
          title="Open sidebar"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 12h18M3 6h18M3 18h18" />
          </svg>
        </button>
      </div>
    );
  }

  return (
    <div
      className="w-64 border-r flex flex-col h-full"
      style={{
        borderColor: "var(--color-border)",
        backgroundColor: "var(--color-sidebar)",
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-3 border-b" style={{ borderColor: "var(--color-border)" }}>
        <span className="text-sm font-semibold" style={{ color: "var(--color-text)" }}>
          Chats
        </span>
        <div className="flex items-center gap-1">
          <button
            onClick={toggleSidebar}
            className="text-[var(--color-text-secondary)] hover:text-[var(--color-text)] p-1 cursor-pointer"
            title="Close sidebar"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M11 19l-7-7 7-7M18 19l-7-7 7-7" />
            </svg>
          </button>
        </div>
      </div>

      {/* New Chat */}
      <div className="px-3 py-2">
        <Button variant="primary" size="sm" className="w-full" onClick={handleNewChat}>
          + New Chat
        </Button>
      </div>

      {/* Conversation List */}
      <div className="flex-1 overflow-y-auto px-2">
        {sortedConvs.map((conv) => (
          <div
            key={conv.id}
            className="group flex items-center gap-1 rounded-lg px-2 py-1.5 mb-0.5 cursor-pointer transition-colors"
            style={{
              backgroundColor:
                conv.id === activeConversationId
                  ? "var(--color-accent-light)"
                  : "transparent",
            }}
            onClick={() => handleSelectConv(conv.id)}
            onMouseEnter={(e) => {
              if (conv.id !== activeConversationId) {
                e.currentTarget.style.backgroundColor = "var(--color-bg-tertiary)";
              }
            }}
            onMouseLeave={(e) => {
              if (conv.id !== activeConversationId) {
                e.currentTarget.style.backgroundColor = "transparent";
              }
            }}
          >
            <span
              className="flex-1 text-xs truncate"
              style={{ color: "var(--color-text)" }}
            >
              {conv.title}
            </span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (confirm("Delete this conversation?")) {
                  deleteConversation(conv.id);
                }
              }}
              className="opacity-0 group-hover:opacity-100 text-[var(--color-text-tertiary)] hover:text-[var(--color-error)] transition-opacity cursor-pointer text-xs"
              title="Delete"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m3 0v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6h14" />
              </svg>
            </button>
          </div>
        ))}

        {sortedConvs.length === 0 && (
          <p className="text-xs text-center mt-4" style={{ color: "var(--color-text-tertiary)" }}>
            No conversations yet
          </p>
        )}
      </div>

      {/* Footer */}
      <div className="border-t px-3 py-2" style={{ borderColor: "var(--color-border)" }}>
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start"
          onClick={() => setSettingsOpen(true)}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="3" />
            <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
          </svg>
          Settings
        </Button>
      </div>
    </div>
  );
}
