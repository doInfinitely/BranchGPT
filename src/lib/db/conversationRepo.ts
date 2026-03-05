import { db } from "./database";
import type { Conversation, MessageNode, ConversationId } from "@/types";

export const conversationRepo = {
  async listConversations(): Promise<Conversation[]> {
    return db.conversations.orderBy("updatedAt").reverse().toArray();
  },

  async getConversation(id: ConversationId): Promise<Conversation | undefined> {
    return db.conversations.get(id);
  },

  async saveConversation(conv: Conversation): Promise<void> {
    await db.conversations.put(conv);
  },

  async deleteConversation(id: ConversationId): Promise<void> {
    await db.transaction("rw", db.conversations, db.messageNodes, async () => {
      await db.messageNodes.where("conversationId").equals(id).delete();
      await db.conversations.delete(id);
    });
  },

  async getNodesForConversation(id: ConversationId): Promise<MessageNode[]> {
    return db.messageNodes.where("conversationId").equals(id).toArray();
  },

  async saveNode(node: MessageNode): Promise<void> {
    await db.messageNodes.put(node);
  },

  async saveNodes(nodes: MessageNode[]): Promise<void> {
    await db.messageNodes.bulkPut(nodes);
  },

  async updateNodeContent(id: string, content: string, status: MessageNode["status"]): Promise<void> {
    await db.messageNodes.update(id, { content, status });
  },
};
