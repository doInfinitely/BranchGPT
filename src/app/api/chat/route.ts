import { NextRequest } from "next/server";
import OpenAI from "openai";
import Anthropic from "@anthropic-ai/sdk";
import { auth } from "@/lib/auth";
import { recordUsage, checkQuota } from "@/lib/usage";
import type { Provider, GenerationParams } from "@/types";

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

interface ChatRequestBody {
  messages: ChatMessage[];
  model: string;
  provider: Provider;
  generationParams: GenerationParams;
}

const ANON_LIMIT = 5;

export async function POST(req: NextRequest) {
  const session = await auth();
  const byokKey =
    req.headers.get("x-openai-key") || req.headers.get("x-anthropic-key") || "";

  const body: ChatRequestBody = await req.json();
  const { messages, model, provider, generationParams } = body;

  // Determine which API key to use
  let apiKey: string;
  let isManaged = false;

  if (byokKey) {
    // BYOK mode — user provides their own key, no metering
    apiKey = byokKey;
  } else if (session?.user?.id) {
    // Authenticated + managed key
    const quota = await checkQuota(session.user.id);
    if (!quota.allowed) {
      return Response.json({ error: quota.reason }, { status: 402 });
    }
    apiKey =
      provider === "openai"
        ? process.env.OPENAI_API_KEY ?? ""
        : process.env.ANTHROPIC_API_KEY ?? "";
    if (!apiKey) {
      return Response.json(
        { error: `No server-side ${provider} API key configured` },
        { status: 500 }
      );
    }
    isManaged = true;
  } else {
    // Anonymous — use managed keys with strict IP-based limit
    const anonId = req.headers.get("x-forwarded-for") ?? "unknown";
    const anonKey = `anon:${anonId}`;
    // Simple cookie-based throttle via header
    const anonCount = parseInt(req.cookies.get("bgpt_anon_count")?.value ?? "0");
    if (anonCount >= ANON_LIMIT) {
      return Response.json(
        { error: "Anonymous limit reached. Sign up for free to continue." },
        { status: 429 }
      );
    }
    apiKey =
      provider === "openai"
        ? process.env.OPENAI_API_KEY ?? ""
        : process.env.ANTHROPIC_API_KEY ?? "";
    if (!apiKey) {
      return Response.json(
        { error: `No server-side ${provider} API key configured. Please provide your own API key.` },
        { status: 500 }
      );
    }
    isManaged = true;
  }

  if (provider === "openai") {
    return streamOpenAI(messages, model, generationParams, apiKey, isManaged, session?.user?.id, req);
  } else {
    return streamAnthropic(messages, model, generationParams, apiKey, isManaged, session?.user?.id, req);
  }
}

function streamOpenAI(
  messages: ChatMessage[],
  model: string,
  params: GenerationParams,
  apiKey: string,
  isManaged: boolean,
  userId: string | undefined,
  req: NextRequest
) {
  const encoder = new TextEncoder();

  const openaiMessages = messages.map((m) => {
    if (typeof m.content === "string") {
      return { role: m.role, content: m.content };
    }
    const parts: OpenAI.Chat.Completions.ChatCompletionContentPart[] = [];
    for (const block of m.content) {
      if (block.type === "text" && block.text) {
        parts.push({ type: "text" as const, text: block.text });
      } else if (block.type === "image_url" && block.image_url) {
        parts.push({
          type: "image_url" as const,
          image_url: { url: block.image_url.url },
        });
      }
    }
    return { role: m.role, content: parts };
  });

  const stream = new ReadableStream({
    async start(controller) {
      try {
        const client = new OpenAI({ apiKey });
        const isReasoning = /^(o[34]|gpt-5)/.test(model);
        const response = await client.chat.completions.create({
          model,
          messages: openaiMessages as OpenAI.Chat.Completions.ChatCompletionMessageParam[],
          stream: true,
          stream_options: { include_usage: true },
          ...(isReasoning
            ? { max_completion_tokens: params.maxTokens }
            : {
                temperature: params.temperature,
                max_tokens: params.maxTokens,
                top_p: params.topP,
                frequency_penalty: params.frequencyPenalty,
                presence_penalty: params.presencePenalty,
              }),
        });

        let promptTokens = 0;
        let completionTokens = 0;

        for await (const chunk of response) {
          const delta = chunk.choices[0]?.delta;
          // Debug: log delta keys to see if reasoning_content is present
          if (delta && Object.keys(delta).length > 0) {
            const keys = Object.keys(delta).filter(k => (delta as Record<string, unknown>)[k] != null);
            if (keys.length > 0 && !keys.every(k => k === 'role')) {
              console.log('[stream delta keys]', keys);
            }
          }
          const reasoning = (delta as Record<string, unknown>)?.reasoning_content;
          if (reasoning && typeof reasoning === 'string') {
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ reasoning })}\n\n`)
            );
          }
          const content = delta?.content;
          if (content) {
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ content })}\n\n`)
            );
          }
          if (chunk.usage) {
            promptTokens = chunk.usage.prompt_tokens;
            completionTokens = chunk.usage.completion_tokens;
          }
        }

        // Record usage for managed keys
        if (isManaged && userId && (promptTokens || completionTokens)) {
          recordUsage({ userId, provider: "openai", model, promptTokens, completionTokens }).catch(() => {});
        }

        // Increment anonymous counter
        if (isManaged && !userId) {
          const anonCount = parseInt(req.cookies.get("bgpt_anon_count")?.value ?? "0");
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ __setCookie: `bgpt_anon_count=${anonCount + 1}; Path=/; Max-Age=86400` })}\n\n`)
          );
        }

        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
        controller.close();
      } catch (err) {
        const message = err instanceof Error ? err.message : "OpenAI error";
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ error: message })}\n\n`)
        );
        controller.close();
      }
    },
  });

  const headers: HeadersInit = {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
  };

  // Set anon cookie via Set-Cookie header
  if (isManaged && !userId) {
    const anonCount = parseInt(req.cookies.get("bgpt_anon_count")?.value ?? "0");
    headers["Set-Cookie"] = `bgpt_anon_count=${anonCount + 1}; Path=/; Max-Age=86400; SameSite=Lax`;
  }

  return new Response(stream, { headers });
}

function streamAnthropic(
  messages: ChatMessage[],
  model: string,
  params: GenerationParams,
  apiKey: string,
  isManaged: boolean,
  userId: string | undefined,
  req: NextRequest
) {
  const encoder = new TextEncoder();

  const systemMessages = messages.filter((m) => m.role === "system");
  const chatMessages = messages
    .filter((m) => m.role !== "system")
    .map((m) => {
      if (typeof m.content === "string") {
        return { role: m.role as "user" | "assistant", content: m.content };
      }
      const blocks: Anthropic.Messages.ContentBlockParam[] = [];
      for (const block of m.content) {
        if (block.type === "text" && block.text) {
          blocks.push({ type: "text", text: block.text });
        } else if (block.type === "image" && block.source) {
          blocks.push({
            type: "image",
            source: {
              type: "base64",
              media_type: block.source.media_type as "image/jpeg" | "image/png" | "image/gif" | "image/webp",
              data: block.source.data,
            },
          });
        }
      }
      return { role: m.role as "user" | "assistant", content: blocks };
    });

  const systemText = systemMessages
    .map((m) => (typeof m.content === "string" ? m.content : ""))
    .join("\n");

  const stream = new ReadableStream({
    async start(controller) {
      try {
        const client = new Anthropic({ apiKey });
        const response = await client.messages.stream({
          model,
          messages: chatMessages,
          max_tokens: params.maxTokens ?? 4096,
          temperature: params.temperature,
          top_p: params.topP,
          top_k: params.topK,
          ...(systemText && { system: systemText }),
        });

        let promptTokens = 0;
        let completionTokens = 0;

        for await (const event of response) {
          if (
            event.type === "content_block_delta" &&
            event.delta.type === "text_delta"
          ) {
            controller.enqueue(
              encoder.encode(
                `data: ${JSON.stringify({ content: event.delta.text })}\n\n`
              )
            );
          }
          if (event.type === "message_delta" && "usage" in event) {
            const usage = (event as { usage?: { output_tokens?: number } }).usage;
            if (usage?.output_tokens) completionTokens = usage.output_tokens;
          }
          if (event.type === "message_start" && "message" in event) {
            const msg = (event as { message?: { usage?: { input_tokens?: number } } }).message;
            if (msg?.usage?.input_tokens) promptTokens = msg.usage.input_tokens;
          }
        }

        // Record usage for managed keys
        if (isManaged && userId && (promptTokens || completionTokens)) {
          recordUsage({ userId, provider: "anthropic", model, promptTokens, completionTokens }).catch(() => {});
        }

        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
        controller.close();
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Anthropic error";
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ error: message })}\n\n`)
        );
        controller.close();
      }
    },
  });

  const headers: HeadersInit = {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
  };

  if (isManaged && !userId) {
    const anonCount = parseInt(req.cookies.get("bgpt_anon_count")?.value ?? "0");
    headers["Set-Cookie"] = `bgpt_anon_count=${anonCount + 1}; Path=/; Max-Age=86400; SameSite=Lax`;
  }

  return new Response(stream, { headers });
}
