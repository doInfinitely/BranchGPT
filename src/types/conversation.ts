export type NodeId = string;
export type ConversationId = string;
export type Provider = "openai" | "anthropic";
export type Role = "system" | "user" | "assistant";
export type NodeStatus = "pending" | "streaming" | "complete" | "error";

export interface Attachment {
  id: string;
  fileName: string;
  mimeType: string;
  /** base64-encoded data */
  data: string;
  width?: number;
  height?: number;
}

export interface MessageNode {
  id: NodeId;
  conversationId: ConversationId;
  parentId: NodeId | null;
  childIds: NodeId[];
  role: Role;
  content: string;
  reasoning: string;
  attachments: Attachment[];
  provider: Provider;
  model: string;
  generationParams?: GenerationParams;
  usage?: TokenUsage;
  contextSourceIds?: NodeId[];
  status: NodeStatus;
  createdAt: number;
}

export interface GenerationParams {
  temperature?: number;
  topP?: number;
  topK?: number;
  maxTokens?: number;
  systemPrompt?: string;
  frequencyPenalty?: number;
  presencePenalty?: number;
}

export interface TokenUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

export interface Conversation {
  id: ConversationId;
  title: string;
  rootNodeId: NodeId | null;
  defaultProvider: Provider;
  defaultModel: string;
  createdAt: number;
  updatedAt: number;
}
