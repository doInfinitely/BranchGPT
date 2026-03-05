import type { MessageNode, NodeId } from "@/types";

/**
 * Walk the ancestor chain from a node to the root, collecting unique nodes.
 * Returns nodes in root-first (topological) order.
 */
export function getAncestorChain(
  nodeId: NodeId,
  nodes: Record<NodeId, MessageNode>
): MessageNode[] {
  const chain: MessageNode[] = [];
  let current: MessageNode | undefined = nodes[nodeId];
  while (current) {
    chain.unshift(current);
    current = current.parentId ? nodes[current.parentId] : undefined;
  }
  return chain;
}

/**
 * Gather context from multiple selected nodes.
 * Walks ancestor chains and deduplicates, returning unique nodes in topological order.
 */
export function gatherContextNodes(
  selectedIds: NodeId[],
  nodes: Record<NodeId, MessageNode>
): MessageNode[] {
  const visited = new Set<NodeId>();
  const result: MessageNode[] = [];

  // Collect all ancestors for each selected node
  for (const id of selectedIds) {
    const chain = getAncestorChain(id, nodes);
    for (const node of chain) {
      if (!visited.has(node.id)) {
        visited.add(node.id);
        result.push(node);
      }
    }
  }

  // Topological sort: since chains are root-first and we deduplicate,
  // we just need to sort by createdAt to get proper ordering
  result.sort((a, b) => a.createdAt - b.createdAt);
  return result;
}

/**
 * Get all nodes belonging to a conversation, organized as a tree.
 */
export function getConversationNodes(
  conversationId: string,
  nodes: Record<NodeId, MessageNode>
): MessageNode[] {
  return Object.values(nodes).filter(
    (n) => n.conversationId === conversationId
  );
}

/**
 * Get the connected branch of hidden nodes starting from a given hidden node.
 * Walks down the tree collecting hidden descendants.
 */
export function getConnectedHiddenBranch(
  nodeId: NodeId,
  nodes: Record<NodeId, MessageNode>,
  hiddenNodeIds: Set<NodeId>
): Set<NodeId> {
  const result = new Set<NodeId>();
  const queue = [nodeId];
  while (queue.length > 0) {
    const id = queue.pop()!;
    if (!hiddenNodeIds.has(id) || result.has(id)) continue;
    result.add(id);
    const node = nodes[id];
    if (node) {
      for (const childId of node.childIds) {
        queue.push(childId);
      }
    }
  }
  return result;
}

/**
 * Find all leaf nodes (nodes with no children) in a conversation.
 */
export function getLeafNodes(
  conversationId: string,
  nodes: Record<NodeId, MessageNode>
): MessageNode[] {
  return getConversationNodes(conversationId, nodes).filter(
    (n) => n.childIds.length === 0
  );
}
