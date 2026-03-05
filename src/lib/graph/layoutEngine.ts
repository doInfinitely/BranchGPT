import dagre from "dagre";
import type { MessageNode, NodeId } from "@/types";
import type { FlowNode, FlowEdge, MessageNodeData, ComposeNodeData } from "@/types";

const NODE_WIDTH = 280;
const NODE_HEIGHT = 120;
const COMPOSE_NODE_WIDTH = 320;
const COMPOSE_NODE_HEIGHT = 160;

interface LayoutOptions {
  rankSeparation?: number;
  nodeSeparation?: number;
  direction?: "TB" | "LR";
}

export function computeLayout(
  nodes: Record<NodeId, MessageNode>,
  conversationId: string,
  selectedNodeIds: Set<NodeId>,
  contextNodeIds: Set<NodeId>,
  activePathIds: Set<NodeId>,
  composeParentId: string | null,
  onBranch: (nodeId: string) => void,
  options: LayoutOptions = {},
  collapsedNodeIds?: Set<NodeId>,
  onToggleCollapse?: (nodeId: string) => void,
): { flowNodes: FlowNode[]; flowEdges: FlowEdge[] } {
  const {
    rankSeparation = 100,
    nodeSeparation = 40,
    direction = "TB",
  } = options;

  const convNodes = Object.values(nodes).filter(
    (n) => n.conversationId === conversationId
  );

  // Empty conversation: just show the compose node centered
  if (convNodes.length === 0 && !composeParentId) {
    return {
      flowNodes: [
        {
          id: "compose",
          type: "compose",
          position: { x: -COMPOSE_NODE_WIDTH / 2, y: -COMPOSE_NODE_HEIGHT / 2 },
          data: { parentNodeId: null } satisfies ComposeNodeData,
        },
      ],
      flowEdges: [],
    };
  }

  const g = new dagre.graphlib.Graph();
  g.setGraph({
    rankdir: direction,
    ranksep: rankSeparation,
    nodesep: nodeSeparation,
    marginx: 40,
    marginy: 40,
  });
  g.setDefaultEdgeLabel(() => ({}));

  for (const node of convNodes) {
    g.setNode(node.id, { width: NODE_WIDTH, height: NODE_HEIGHT });
  }

  for (const node of convNodes) {
    if (node.parentId && nodes[node.parentId]) {
      g.setEdge(node.parentId, node.id);
    }
  }

  // Always add compose node — connected to parent if one is selected
  g.setNode("compose", {
    width: COMPOSE_NODE_WIDTH,
    height: COMPOSE_NODE_HEIGHT,
  });
  if (composeParentId && nodes[composeParentId]) {
    g.setEdge(composeParentId, "compose");
  } else {
    // Attach to deepest leaf to keep it at the bottom of the tree
    const leaves = convNodes.filter((n) => n.childIds.length === 0);
    if (leaves.length > 0) {
      // Pick the most recently created leaf
      const latest = leaves.sort((a, b) => b.createdAt - a.createdAt)[0];
      g.setEdge(latest.id, "compose");
    }
  }

  dagre.layout(g);

  const flowNodes: FlowNode[] = [];
  const flowEdges: FlowEdge[] = [];

  for (const node of convNodes) {
    const pos = g.node(node.id);
    if (!pos) continue;

    flowNodes.push({
      id: node.id,
      type: "message",
      position: { x: pos.x - NODE_WIDTH / 2, y: pos.y - NODE_HEIGHT / 2 },
      data: {
        message: node,
        isSelected: selectedNodeIds.has(node.id),
        isOnActivePath: activePathIds.has(node.id),
        isContextNode: contextNodeIds.has(node.id),
        isCollapsed: collapsedNodeIds?.has(node.id) ?? false,
        onBranch,
        onToggleCollapse,
      } satisfies MessageNodeData,
    });
  }

  // Compose node
  const composePos = g.node("compose");
  if (composePos) {
    flowNodes.push({
      id: "compose",
      type: "compose",
      position: {
        x: composePos.x - COMPOSE_NODE_WIDTH / 2,
        y: composePos.y - COMPOSE_NODE_HEIGHT / 2,
      },
      data: { parentNodeId: composeParentId } satisfies ComposeNodeData,
    });
  }

  // Message edges
  for (const node of convNodes) {
    if (node.parentId && nodes[node.parentId]) {
      flowEdges.push({
        id: `e-${node.parentId}-${node.id}`,
        source: node.parentId,
        target: node.id,
        animated: node.status === "streaming",
        style: {
          stroke: activePathIds.has(node.id) && activePathIds.has(node.parentId)
            ? "var(--color-accent)"
            : "var(--color-edge)",
          strokeWidth: activePathIds.has(node.id) ? 2.5 : 1.5,
        },
      });
    }
  }

  // Compose edge
  if (composeParentId && nodes[composeParentId]) {
    flowEdges.push({
      id: `e-${composeParentId}-compose`,
      source: composeParentId,
      target: "compose",
      animated: true,
      style: { stroke: "var(--color-accent)", strokeDasharray: "5 5" },
    });
  }

  return { flowNodes, flowEdges };
}
