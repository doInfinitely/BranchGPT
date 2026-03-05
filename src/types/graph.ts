import type { Node, Edge } from "@xyflow/react";
import type { MessageNode as MessageNodeType } from "./conversation";

export interface MessageNodeData extends Record<string, unknown> {
  message: MessageNodeType;
  isSelected: boolean;
  isOnActivePath: boolean;
  isContextNode: boolean;
  isCollapsed?: boolean;
  onBranch: (nodeId: string) => void;
  onToggleCollapse?: (nodeId: string) => void;
}

export type FlowMessageNode = Node<MessageNodeData, "message">;

export interface ComposeNodeData extends Record<string, unknown> {
  parentNodeId: string | null;
  selectedNodeIds?: string[];
}

export type FlowComposeNode = Node<ComposeNodeData, "compose">;

export type FlowNode = FlowMessageNode | FlowComposeNode;
export type FlowEdge = Edge;

export type LayoutMode = "reactflow" | "d3force";
