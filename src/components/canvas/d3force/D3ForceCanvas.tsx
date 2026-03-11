"use client";

import { useEffect, useRef, useMemo, useCallback, useState } from "react";
import {
  forceSimulation,
  forceLink,
  forceManyBody,
  forceY,
  forceX,
  type SimulationNodeDatum,
  type SimulationLinkDatum,
} from "d3-force";
import { select } from "d3-selection";
import { zoom as d3zoom, zoomIdentity } from "d3-zoom";
import { useConversationStore } from "@/stores/conversationStore";
import { useSelectionStore } from "@/stores/selectionStore";
import { useUIStore } from "@/stores/uiStore";
import { useSettingsStore } from "@/stores/settingsStore";
import { streamChat, buildMessagesFromChain } from "@/lib/api";
import type { MessageNode } from "@/types";

interface SimNode extends SimulationNodeDatum {
  id: string;
  message?: MessageNode;
  isCompose?: boolean;
}

interface SimLink extends SimulationLinkDatum<SimNode> {
  id: string;
}

const NODE_W = 260;
const NODE_H = 100;

export function D3ForceCanvas() {
  const svgRef = useRef<SVGSVGElement>(null);
  const gRef = useRef<SVGGElement>(null);
  const [simNodes, setSimNodes] = useState<SimNode[]>([]);
  const [simLinks, setSimLinks] = useState<SimLink[]>([]);

  const activeConversationId = useConversationStore((s) => s.activeConversationId);
  const nodes = useConversationStore((s) => s.nodes);
  const selectedNodeIds = useSelectionStore((s) => s.selectedNodeIds);
  const selectNode = useSelectionStore((s) => s.selectNode);
  const toggleNode = useSelectionStore((s) => s.toggleNode);
  const composeParentId = useUIStore((s) => s.composeParentId);
  const setComposeParentId = useUIStore((s) => s.setComposeParentId);

  // Compose state
  const [composeText, setComposeText] = useState("");
  const [isSending, setIsSending] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const addUserMessage = useConversationStore((s) => s.addUserMessage);
  const addAssistantNode = useConversationStore((s) => s.addAssistantNode);
  const appendToNode = useConversationStore((s) => s.appendToNode);
  const appendReasoning = useConversationStore((s) => s.appendReasoning);
  const setNodeStatus = useConversationStore((s) => s.setNodeStatus);
  const persistNode = useConversationStore((s) => s.persistNode);
  const getAncestorChain = useConversationStore((s) => s.getAncestorChain);
  const createConversation = useConversationStore((s) => s.createConversation);
  const updateConversationTitle = useConversationStore((s) => s.updateConversationTitle);

  const provider = useSettingsStore((s) => s.activeProvider);
  const model = useSettingsStore((s) => s.activeModel);
  const generationParams = useSettingsStore((s) => s.generationParams);
  const openaiKey = useSettingsStore((s) => s.openaiApiKey);
  const anthropicKey = useSettingsStore((s) => s.anthropicApiKey);
  const apiKey = provider === "openai" ? openaiKey : anthropicKey;

  // Build simulation data from conversation nodes
  const { nodeData, linkData } = useMemo(() => {
    const nd: SimNode[] = [];
    const ld: SimLink[] = [];

    if (!activeConversationId) {
      nd.push({ id: "compose", isCompose: true, x: 0, y: 0 });
      return { nodeData: nd, linkData: ld };
    }

    const convNodes = Object.values(nodes).filter(
      (n) => n.conversationId === activeConversationId
    );

    for (const n of convNodes) {
      nd.push({ id: n.id, message: n });
      if (n.parentId && nodes[n.parentId]) {
        ld.push({ id: `e-${n.parentId}-${n.id}`, source: n.parentId, target: n.id });
      }
    }

    // Compose node
    nd.push({ id: "compose", isCompose: true });
    if (composeParentId && nodes[composeParentId]) {
      ld.push({ id: `e-${composeParentId}-compose`, source: composeParentId, target: "compose" });
    }

    return { nodeData: nd, linkData: ld };
  }, [nodes, activeConversationId, composeParentId]);

  // Run force simulation
  useEffect(() => {
    const sim = forceSimulation<SimNode>(nodeData)
      .force(
        "link",
        forceLink<SimNode, SimLink>(linkData)
          .id((d) => d.id)
          .distance(160)
      )
      .force("charge", forceManyBody().strength(-400))
      .force("y", forceY(0).strength(0.05))
      .force("x", forceX(0).strength(0.02))
      .on("tick", () => {
        setSimNodes([...sim.nodes()]);
        setSimLinks([...linkData]);
      });

    sim.alpha(0.8).restart();

    return () => {
      sim.stop();
    };
  }, [nodeData, linkData]);

  // Setup zoom
  useEffect(() => {
    if (!svgRef.current || !gRef.current) return;

    const svg = select(svgRef.current);
    const g = select(gRef.current);

    const zoomBehavior = d3zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 3])
      .on("zoom", (event) => {
        g.attr("transform", event.transform.toString());
      });

    svg.call(zoomBehavior);
    svg.call(zoomBehavior.transform, zoomIdentity);

    return () => {
      svg.on(".zoom", null);
    };
  }, []);

  const handleNodeClick = useCallback(
    (e: React.MouseEvent, nodeId: string) => {
      if (nodeId === "compose") return;
      if (e.metaKey || e.ctrlKey) {
        toggleNode(nodeId);
      } else {
        const msg = nodes[nodeId];
        if (msg?.role === "assistant" && msg.status === "complete") {
          setComposeParentId(nodeId);
        }
        selectNode(nodeId);
      }
    },
    [nodes, setComposeParentId, selectNode, toggleNode]
  );

  const handleSend = useCallback(async () => {
    if (!composeText.trim() || isSending || !apiKey) return;
    setIsSending(true);
    const text = composeText.trim();
    setComposeText("");

    let convId = activeConversationId;
    if (!convId) convId = createConversation(provider, model);

    const userNodeId = addUserMessage(convId, composeParentId, text, provider, model);
    const assistantNodeId = addAssistantNode(convId, userNodeId, provider, model);
    selectNode(assistantNodeId);

    const chain = getAncestorChain(userNodeId);
    const messages = buildMessagesFromChain(chain, generationParams.systemPrompt);

    const convNodes = Object.values(nodes).filter((n) => n.conversationId === convId);
    if (convNodes.length <= 1) {
      updateConversationTitle(convId!, text.slice(0, 50) + (text.length > 50 ? "..." : ""));
    }

    const ac = new AbortController();
    abortRef.current = ac;

    await streamChat({
      messages,
      model,
      provider,
      generationParams,
      apiKey,
      signal: ac.signal,
      onReasoning: (chunk) => appendReasoning(assistantNodeId, chunk),
      onChunk: (chunk) => appendToNode(assistantNodeId, chunk),
      onDone: () => {
        setNodeStatus(assistantNodeId, "complete");
        persistNode(assistantNodeId);
        persistNode(userNodeId);
        setComposeParentId(assistantNodeId);
      },
      onError: (error) => {
        setNodeStatus(assistantNodeId, "error");
        appendToNode(assistantNodeId, `\n\nError: ${error}`);
        persistNode(assistantNodeId);
      },
    });

    setIsSending(false);
    abortRef.current = null;
  }, [
    composeText, isSending, apiKey, activeConversationId, composeParentId,
    provider, model, generationParams, nodes,
    createConversation, addUserMessage, addAssistantNode, appendToNode,
    setNodeStatus, persistNode, getAncestorChain, selectNode,
    setComposeParentId, updateConversationTitle,
  ]);

  return (
    <div className="flex-1 h-full relative" style={{ backgroundColor: "var(--color-bg)" }}>
      {/* Dot grid background */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none">
        <defs>
          <pattern id="dot-grid" width="20" height="20" patternUnits="userSpaceOnUse">
            <circle cx="10" cy="10" r="1" fill="var(--color-border-light)" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#dot-grid)" />
      </svg>

      <svg ref={svgRef} className="w-full h-full">
        <g ref={gRef}>
          {/* Edges */}
          {simLinks.map((link) => {
            const source = link.source as SimNode;
            const target = link.target as SimNode;
            if (!source.x || !source.y || !target.x || !target.y) return null;
            return (
              <line
                key={link.id}
                x1={source.x}
                y1={source.y}
                x2={target.x}
                y2={target.y}
                stroke="var(--color-edge)"
                strokeWidth={1.5}
              />
            );
          })}

          {/* Nodes via foreignObject */}
          {simNodes.map((sn) => {
            if (!sn.x || !sn.y) return null;

            if (sn.isCompose) {
              return (
                <foreignObject
                  key="compose"
                  x={(sn.x ?? 0) - 150}
                  y={(sn.y ?? 0) - 60}
                  width={300}
                  height={120}
                >
                  <div
                    className="rounded-xl shadow-lg p-3 flex flex-col gap-2"
                    style={{
                      backgroundColor: "var(--color-compose)",
                      border: "2px solid var(--color-accent)",
                    }}
                  >
                    <textarea
                      value={composeText}
                      onChange={(e) => setComposeText(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          handleSend();
                        }
                      }}
                      placeholder="Type a message..."
                      rows={2}
                      disabled={isSending}
                      className="resize-none rounded-lg border px-2 py-1.5 text-xs focus:outline-none"
                      style={{
                        borderColor: "var(--color-border)",
                        backgroundColor: "var(--color-bg)",
                        color: "var(--color-text)",
                      }}
                    />
                    <div className="flex justify-end">
                      <button
                        onClick={handleSend}
                        disabled={!composeText.trim() || !apiKey || isSending}
                        className="rounded-lg px-3 py-1 text-[11px] font-medium text-white disabled:opacity-40 cursor-pointer"
                        style={{ backgroundColor: "var(--color-accent)" }}
                      >
                        {isSending ? "..." : "Send"}
                      </button>
                    </div>
                  </div>
                </foreignObject>
              );
            }

            const msg = sn.message!;
            const isUser = msg.role === "user";
            const isSelected = selectedNodeIds.has(msg.id);

            return (
              <foreignObject
                key={msg.id}
                x={(sn.x ?? 0) - NODE_W / 2}
                y={(sn.y ?? 0) - NODE_H / 2}
                width={NODE_W}
                height={NODE_H}
                onClick={(e) => handleNodeClick(e, msg.id)}
                className="cursor-pointer"
              >
                <div
                  className="rounded-xl px-3 py-2 shadow-sm h-full overflow-hidden"
                  style={{
                    backgroundColor: isUser
                      ? "var(--color-node-user)"
                      : "var(--color-node-assistant)",
                    color: isUser
                      ? "var(--color-node-user-text)"
                      : "var(--color-node-assistant-text)",
                    border: isSelected
                      ? "2px solid var(--color-accent)"
                      : "1px solid var(--color-border)",
                  }}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] font-semibold uppercase opacity-60">
                      {msg.role}
                    </span>
                    <span
                      className="text-[8px] px-1.5 py-0.5 rounded-full"
                      style={{
                        backgroundColor: "var(--color-bg-tertiary)",
                        color: "var(--color-text-secondary)",
                      }}
                    >
                      {msg.model}
                    </span>
                  </div>
                  <div className="text-xs leading-relaxed whitespace-pre-wrap break-words max-h-16 overflow-hidden">
                    {msg.content || (msg.status === "streaming" ? "..." : "")}
                  </div>
                </div>
              </foreignObject>
            );
          })}
        </g>
      </svg>
    </div>
  );
}
