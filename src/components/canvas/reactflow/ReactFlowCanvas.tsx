"use client";

import { useCallback, useEffect, useMemo } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  BackgroundVariant,
  useReactFlow,
  ReactFlowProvider,
  type NodeTypes,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import { useConversationStore } from "@/stores/conversationStore";
import { useSelectionStore } from "@/stores/selectionStore";
import { useUIStore } from "@/stores/uiStore";
import { computeLayout } from "@/lib/graph";
import { gatherContextNodes } from "@/lib/graph";
import type { MessageNode } from "@/types";
import { MessageNodeMemo } from "./MessageNode";
import { ComposeNodeMemo } from "./ComposeNode";
import { SelectionContour } from "./SelectionContour";
import { HiddenNodesPanel } from "./HiddenNodesPanel";

const nodeTypes: NodeTypes = {
  message: MessageNodeMemo,
  compose: ComposeNodeMemo,
};

function ReactFlowCanvasInner() {
  const activeConversationId = useConversationStore((s) => s.activeConversationId);
  const nodes = useConversationStore((s) => s.nodes);
  const selectedNodeIds = useSelectionStore((s) => s.selectedNodeIds);
  const toggleNode = useSelectionStore((s) => s.toggleNode);
  const selectNode = useSelectionStore((s) => s.selectNode);
  const composeParentId = useUIStore((s) => s.composeParentId);
  const setComposeParentId = useUIStore((s) => s.setComposeParentId);
  const collapsedNodeIds = useUIStore((s) => s.collapsedNodeIds);
  const toggleCollapse = useUIStore((s) => s.toggleCollapse);
  const hiddenNodeIds = useUIStore((s) => s.hiddenNodeIds);
  const { fitView } = useReactFlow();

  // Filter out hidden nodes
  const visibleNodes = useMemo(() => {
    if (hiddenNodeIds.size === 0) return nodes;
    const filtered: Record<string, MessageNode> = {};
    for (const [id, node] of Object.entries(nodes)) {
      if (!hiddenNodeIds.has(id)) filtered[id] = node;
    }
    return filtered;
  }, [nodes, hiddenNodeIds]);

  const handleBranch = useCallback(
    (nodeId: string) => {
      setComposeParentId(nodeId);
      selectNode(nodeId);
    },
    [setComposeParentId, selectNode]
  );

  // Compute active path: ancestors of compose parent
  const activePathIds = useMemo(() => {
    const set = new Set<string>();
    if (!composeParentId) return set;
    let current: MessageNode | undefined = nodes[composeParentId];
    while (current) {
      set.add(current.id);
      current = current.parentId ? nodes[current.parentId] : undefined;
    }
    return set;
  }, [nodes, composeParentId]);

  // Compute context nodes from multi-selection
  const contextNodeIds = useMemo(() => {
    if (selectedNodeIds.size <= 1) return new Set<string>();
    const gathered = gatherContextNodes(Array.from(selectedNodeIds), nodes);
    return new Set(gathered.map((n) => n.id));
  }, [selectedNodeIds, nodes]);

  const { flowNodes, flowEdges } = useMemo(() => {
    if (!activeConversationId) {
      return {
        flowNodes: [
          {
            id: "compose",
            type: "compose" as const,
            position: { x: -160, y: -80 },
            data: { parentNodeId: null },
          },
        ],
        flowEdges: [],
      };
    }

    return computeLayout(
      visibleNodes,
      activeConversationId,
      selectedNodeIds,
      contextNodeIds,
      activePathIds,
      composeParentId,
      handleBranch,
      {},
      collapsedNodeIds,
      toggleCollapse,
    );
  }, [visibleNodes, activeConversationId, selectedNodeIds, contextNodeIds, activePathIds, composeParentId, handleBranch, collapsedNodeIds, toggleCollapse]);

  // Re-fit view when node count changes
  useEffect(() => {
    const timeout = setTimeout(() => fitView({ padding: 0.3, duration: 200 }), 50);
    return () => clearTimeout(timeout);
  }, [flowNodes.length, fitView]);

  // Cmd/Ctrl+click for multi-select, plain click for single select + branch
  const handleNodeClick = useCallback(
    (event: React.MouseEvent, node: { id: string }) => {
      if (node.id === "compose") return;

      if (event.metaKey || event.ctrlKey) {
        // Multi-select toggle
        toggleNode(node.id);
      } else {
        const messageNode = nodes[node.id];
        if (messageNode?.role === "assistant" && messageNode.status === "complete") {
          setComposeParentId(node.id);
        }
        selectNode(node.id);
      }
    },
    [nodes, setComposeParentId, selectNode, toggleNode]
  );

  // Collect positions for the contour overlay
  const contextPositions = useMemo(() => {
    if (contextNodeIds.size === 0) return [];
    return flowNodes
      .filter((n) => n.type === "message" && contextNodeIds.has(n.id))
      .map((n) => ({
        x: n.position.x,
        y: n.position.y,
        width: 280,
        height: 120,
      }));
  }, [flowNodes, contextNodeIds]);

  const composePosition = useMemo(() => {
    const cn = flowNodes.find((n) => n.id === "compose");
    return cn ? { x: cn.position.x + 160, y: cn.position.y } : null;
  }, [flowNodes]);

  return (
    <div className="flex-1 h-full relative">
      <HiddenNodesPanel nodes={nodes} />
      <ReactFlow
        nodes={flowNodes}
        edges={flowEdges}
        nodeTypes={nodeTypes}
        onNodeClick={handleNodeClick}
        fitView
        fitViewOptions={{ padding: 0.3 }}
        minZoom={0.1}
        maxZoom={2}
        proOptions={{ hideAttribution: true }}
        nodesDraggable={false}
        nodesConnectable={false}
        edgesFocusable={false}
      >
        <Background
          variant={BackgroundVariant.Dots}
          gap={20}
          size={1}
          color="var(--color-border-light)"
        />
        <Controls
          showInteractive={false}
          className="!bg-[var(--color-bg)] !border-[var(--color-border)] !shadow-sm [&>button]:!bg-[var(--color-bg)] [&>button]:!border-[var(--color-border)] [&>button]:!fill-[var(--color-text-secondary)]"
        />
        {contextPositions.length > 0 && (
          <SelectionContour
            groups={[{ nodeRects: contextPositions, arrowTarget: composePosition }]}
          />
        )}
      </ReactFlow>
    </div>
  );
}

export function ReactFlowCanvas() {
  return (
    <ReactFlowProvider>
      <ReactFlowCanvasInner />
    </ReactFlowProvider>
  );
}
