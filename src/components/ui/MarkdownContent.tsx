"use client";

import { useMemo } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import rehypeHighlight from "rehype-highlight";
import "katex/dist/katex.min.css";

interface MarkdownContentProps {
  content: string;
  className?: string;
}

/**
 * Convert LLM-style LaTeX delimiters to remark-math compatible ones.
 * \[ ... \] → $$ ... $$
 * \( ... \) → $ ... $
 */
function normalizeLatex(text: string): string {
  // Display math: \[ ... \] (can span multiple lines)
  let result = text.replace(/\\\[([\s\S]*?)\\\]/g, (_match, inner) => {
    return `$$${inner}$$`;
  });
  // Inline math: \( ... \)
  result = result.replace(/\\\(([\s\S]*?)\\\)/g, (_match, inner) => {
    return `$${inner}$`;
  });
  return result;
}

export function MarkdownContent({ content, className }: MarkdownContentProps) {
  const normalized = useMemo(() => normalizeLatex(content), [content]);

  return (
    <div className={className}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[rehypeKatex, rehypeHighlight]}
      >
        {normalized}
      </ReactMarkdown>
    </div>
  );
}
