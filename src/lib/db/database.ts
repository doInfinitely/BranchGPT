import Dexie, { type EntityTable } from "dexie";
import type { MessageNode, Conversation } from "@/types";

class BranchGPTDatabase extends Dexie {
  conversations!: EntityTable<Conversation, "id">;
  messageNodes!: EntityTable<MessageNode, "id">;

  constructor() {
    super("branchgpt");
    this.version(1).stores({
      conversations: "id, createdAt, updatedAt",
      messageNodes: "id, conversationId, parentId, createdAt",
    });
  }
}

export const db = new BranchGPTDatabase();
