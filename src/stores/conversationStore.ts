import { create } from "zustand";
import { immer } from "zustand/middleware/immer";
import { nanoid } from "nanoid";
import type {
  Conversation,
  ConversationId,
  MessageNode,
  NodeId,
  Provider,
  NodeStatus,
} from "@/types";
import { conversationRepo } from "@/lib/db";

interface ConversationState {
  conversations: Record<ConversationId, Conversation>;
  nodes: Record<NodeId, MessageNode>;
  activeConversationId: ConversationId | null;

  // Actions
  loadConversations: () => Promise<void>;
  loadConversation: (id: ConversationId) => Promise<void>;
  createConversation: (provider: Provider, model: string) => ConversationId;
  deleteConversation: (id: ConversationId) => Promise<void>;
  setActiveConversation: (id: ConversationId | null) => void;
  updateConversationTitle: (id: ConversationId, title: string) => void;

  addUserMessage: (
    conversationId: ConversationId,
    parentId: NodeId | null,
    content: string,
    provider: Provider,
    model: string
  ) => NodeId;

  addAssistantNode: (
    conversationId: ConversationId,
    parentId: NodeId,
    provider: Provider,
    model: string
  ) => NodeId;

  appendToNode: (nodeId: NodeId, chunk: string) => void;
  appendReasoning: (nodeId: NodeId, chunk: string) => void;
  setNodeStatus: (nodeId: NodeId, status: NodeStatus) => void;
  setNodeContent: (nodeId: NodeId, content: string) => void;
  persistNode: (nodeId: NodeId) => Promise<void>;

  getActiveConversation: () => Conversation | null;
  getAncestorChain: (nodeId: NodeId) => MessageNode[];
}

export const useConversationStore = create<ConversationState>()(
  immer((set, get) => ({
    conversations: {},
    nodes: {},
    activeConversationId: null,

    async loadConversations() {
      const convs = await conversationRepo.listConversations();
      set((state) => {
        for (const c of convs) {
          state.conversations[c.id] = c;
        }
      });
    },

    async loadConversation(id) {
      const nodes = await conversationRepo.getNodesForConversation(id);
      set((state) => {
        for (const n of nodes) {
          state.nodes[n.id] = n;
        }
        state.activeConversationId = id;
      });
    },

    createConversation(provider, model) {
      const id = nanoid();
      const conv: Conversation = {
        id,
        title: "New Chat",
        rootNodeId: null,
        defaultProvider: provider,
        defaultModel: model,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      set((state) => {
        state.conversations[id] = conv;
        state.activeConversationId = id;
      });
      conversationRepo.saveConversation(conv);
      return id;
    },

    async deleteConversation(id) {
      await conversationRepo.deleteConversation(id);
      set((state) => {
        delete state.conversations[id];
        // Remove nodes belonging to this conversation
        for (const [nodeId, node] of Object.entries(state.nodes)) {
          if (node.conversationId === id) {
            delete state.nodes[nodeId];
          }
        }
        if (state.activeConversationId === id) {
          state.activeConversationId = null;
        }
      });
    },

    setActiveConversation(id) {
      set({ activeConversationId: id });
    },

    updateConversationTitle(id, title) {
      set((state) => {
        if (state.conversations[id]) {
          state.conversations[id].title = title;
          state.conversations[id].updatedAt = Date.now();
        }
      });
      const conv = get().conversations[id];
      if (conv) conversationRepo.saveConversation(conv);
    },

    addUserMessage(conversationId, parentId, content, provider, model) {
      const id = nanoid();
      const node: MessageNode = {
        id,
        conversationId,
        parentId,
        childIds: [],
        role: "user",
        content,
        reasoning: "",
        attachments: [],
        provider,
        model,
        status: "complete",
        createdAt: Date.now(),
      };

      set((state) => {
        state.nodes[id] = node;
        if (parentId && state.nodes[parentId]) {
          state.nodes[parentId].childIds.push(id);
        }
        // Set as root if no parent
        if (!parentId && state.conversations[conversationId]) {
          state.conversations[conversationId].rootNodeId = id;
          state.conversations[conversationId].updatedAt = Date.now();
        }
      });

      // Persist
      conversationRepo.saveNode(node);
      if (parentId) {
        const parent = get().nodes[parentId];
        if (parent) conversationRepo.saveNode(parent);
      }
      const conv = get().conversations[conversationId];
      if (conv) conversationRepo.saveConversation(conv);

      return id;
    },

    addAssistantNode(conversationId, parentId, provider, model) {
      const id = nanoid();
      const node: MessageNode = {
        id,
        conversationId,
        parentId,
        childIds: [],
        role: "assistant",
        content: "",
        reasoning: "",
        attachments: [],
        provider,
        model,
        status: "streaming",
        createdAt: Date.now(),
      };

      set((state) => {
        state.nodes[id] = node;
        if (state.nodes[parentId]) {
          state.nodes[parentId].childIds.push(id);
        }
      });

      return id;
    },

    appendToNode(nodeId, chunk) {
      set((state) => {
        if (state.nodes[nodeId]) {
          state.nodes[nodeId].content += chunk;
        }
      });
    },

    appendReasoning(nodeId, chunk) {
      set((state) => {
        if (state.nodes[nodeId]) {
          state.nodes[nodeId].reasoning += chunk;
        }
      });
    },

    setNodeStatus(nodeId, status) {
      set((state) => {
        if (state.nodes[nodeId]) {
          state.nodes[nodeId].status = status;
        }
      });
    },

    setNodeContent(nodeId, content) {
      set((state) => {
        if (state.nodes[nodeId]) {
          state.nodes[nodeId].content = content;
        }
      });
    },

    async persistNode(nodeId) {
      const node = get().nodes[nodeId];
      if (node) {
        await conversationRepo.saveNode(node);
      }
    },

    getActiveConversation() {
      const { activeConversationId, conversations } = get();
      if (!activeConversationId) return null;
      return conversations[activeConversationId] ?? null;
    },

    getAncestorChain(nodeId) {
      const { nodes } = get();
      const chain: MessageNode[] = [];
      let current: MessageNode | undefined = nodes[nodeId];
      while (current) {
        chain.unshift(current);
        current = current.parentId ? nodes[current.parentId] : undefined;
      }
      return chain;
    },
  }))
);
