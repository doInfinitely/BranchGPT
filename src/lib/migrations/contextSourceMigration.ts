import type { MessageNode, NodeId } from "@/types";
import { conversationRepo } from "@/lib/db";

/**
 * One-time migration: find user messages that were sent via multi-select
 * (identifiable by content like "which example") and backfill their
 * contextSourceIds from the tree structure.
 *
 * Heuristic: if a user node's parent is an assistant node, and that
 * assistant's parent has multiple assistant children, the user was likely
 * comparing those siblings. Set contextSourceIds to those sibling IDs.
 */
export async function migrateContextSourceIds(
  nodes: Record<NodeId, MessageNode>
): Promise<MessageNode[]> {
  const updated: MessageNode[] = [];

  for (const node of Object.values(nodes)) {
    // Only migrate user messages that don't already have contextSourceIds
    if (node.role !== "user") continue;
    if (node.contextSourceIds && node.contextSourceIds.length > 0) continue;

    // Look for the known multi-select message
    const lower = node.content.toLowerCase();
    if (!lower.includes("which example")) continue;

    // Parent should be an assistant node (the last selected node)
    const parent = node.parentId ? nodes[node.parentId] : undefined;
    if (!parent || parent.role !== "assistant") continue;

    // Grandparent: the user message that spawned the compared examples
    const grandparent = parent.parentId ? nodes[parent.parentId] : undefined;
    if (!grandparent) continue;

    // Sibling assistant nodes of the parent = the compared examples
    const siblingAssistants = grandparent.childIds
      .map((id) => nodes[id])
      .filter((n) => n && n.role === "assistant" && n.status === "complete")
      .map((n) => n.id);

    if (siblingAssistants.length < 2) continue;

    // Set contextSourceIds
    node.contextSourceIds = siblingAssistants;
    updated.push(node);
  }

  // Persist updated nodes
  if (updated.length > 0) {
    await conversationRepo.saveNodes(updated);
  }

  return updated;
}
