import type { Provider, GenerationParams, MessageNode, Attachment } from "@/types";

type MessageContent = string | ContentBlock[];

interface ContentBlock {
  type: string;
  text?: string;
  image_url?: { url: string };
  source?: { type: string; media_type: string; data: string };
}

interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: MessageContent;
}

export interface StreamChatParams {
  messages: ChatMessage[];
  model: string;
  provider: Provider;
  generationParams: GenerationParams;
  apiKey: string;
  keyMode?: "byok" | "managed";
  onChunk: (chunk: string) => void;
  onReasoning?: (chunk: string) => void;
  onDone: () => void;
  onError: (error: string) => void;
  signal?: AbortSignal;
}

export async function streamChat({
  messages,
  model,
  provider,
  generationParams,
  apiKey,
  onChunk,
  onReasoning,
  onDone,
  onError,
  signal,
}: StreamChatParams): Promise<void> {
  try {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (provider === "openai") {
      headers["x-openai-key"] = apiKey;
    } else {
      headers["x-anthropic-key"] = apiKey;
    }

    const response = await fetch("/api/chat", {
      method: "POST",
      headers,
      body: JSON.stringify({
        messages,
        model,
        provider,
        generationParams,
      }),
      signal,
    });

    if (!response.ok) {
      const text = await response.text();
      onError(`API error: ${response.status} - ${text}`);
      return;
    }

    const reader = response.body?.getReader();
    if (!reader) {
      onError("No response body");
      return;
    }

    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";

      for (const line of lines) {
        if (line.startsWith("data: ")) {
          const data = line.slice(6);
          if (data === "[DONE]") {
            onDone();
            return;
          }
          try {
            const parsed = JSON.parse(data);
            if (parsed.reasoning && onReasoning) {
              onReasoning(parsed.reasoning);
            }
            if (parsed.content) {
              onChunk(parsed.content);
            }
            if (parsed.error) {
              onError(parsed.error);
              return;
            }
          } catch {
            // Skip malformed JSON lines
          }
        }
      }
    }

    onDone();
  } catch (err) {
    if (signal?.aborted) return;
    onError(err instanceof Error ? err.message : "Unknown error");
  }
}

/**
 * Build the messages array from an ancestor chain for sending to the API.
 * Handles image attachments by converting them to provider-specific content blocks.
 */
export function buildMessagesFromChain(
  chain: MessageNode[],
  systemPrompt?: string,
  provider?: Provider
): ChatMessage[] {
  const messages: ChatMessage[] = [];

  if (systemPrompt) {
    messages.push({ role: "system", content: systemPrompt });
  }

  for (const node of chain) {
    if (node.role === "system") continue;

    if (node.attachments.length > 0) {
      // Build multi-modal content blocks
      const blocks: ContentBlock[] = [];

      // Add text content
      if (node.content) {
        blocks.push({ type: "text", text: node.content });
      }

      // Add image attachments
      for (const att of node.attachments) {
        if (att.mimeType.startsWith("image/")) {
          if (provider === "anthropic") {
            blocks.push({
              type: "image",
              source: {
                type: "base64",
                media_type: att.mimeType,
                data: att.data,
              },
            });
          } else {
            // OpenAI format
            blocks.push({
              type: "image_url",
              image_url: {
                url: `data:${att.mimeType};base64,${att.data}`,
              },
            });
          }
        }
      }

      messages.push({ role: node.role, content: blocks });
    } else {
      messages.push({ role: node.role, content: node.content });
    }
  }

  return messages;
}
