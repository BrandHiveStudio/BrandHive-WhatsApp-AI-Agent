"use client";

import React, { useMemo } from "react";

interface ChatMarkdownProps {
  content: string;
  className?: string;
}

export type InlineToken =
  | { type: "text"; value: string }
  | { type: "bold"; value: string }
  | { type: "italic"; value: string }
  | { type: "strike"; value: string }
  | { type: "code"; value: string }
  | { type: "link"; label: string; href: string }
  | { type: "url"; href: string };

export type MessageBlock =
  | { type: "line"; content: string }
  | { type: "ul"; items: string[] }
  | { type: "ol"; items: string[] }
  | { type: "quote"; content: string }
  | { type: "codeblock"; content: string };

/**
 * Validates that a link target uses a safe protocol (http, https, mailto, tel).
 * Explicitly blocks javascript:, data:, vbscript:, and other potentially dangerous schemes.
 */
export function isSafeUrl(url: string): boolean {
  if (!url || typeof url !== "string") return false;
  const trimmed = url.trim();
  return /^https?:\/\//i.test(trimmed) || /^mailto:/i.test(trimmed) || /^tel:/i.test(trimmed);
}

/**
 * Parses inline tokens for bold, italic, strikethrough, monospace, and links.
 * Supports both WhatsApp formatting (*bold*, _italic_, ~strike~, `code`)
 * and standard Markdown (**bold**, ~~strike~~, [label](url)).
 */
export function parseInlineTokens(text: string): InlineToken[] {
  if (!text) return [];

  // Group mappings:
  // 1: [label](url) -> 2: label, 3: url
  // 4: raw URL (https://...)
  // 5: inline code `code` -> 6: code
  // 7: markdown bold **bold**
  // 8: whatsapp bold *bold*
  // 9: italic _italic_
  // 10: markdown strike ~~strike~~
  // 11: whatsapp strike ~strike~
  const inlineRegex =
    /(\[([^\]]+)\]\((https?:\/\/[^\s)]+)\))|(https?:\/\/[^\s<]+[^<.,:;"')\]\s])|(`([^`\n]+)`)|(?:\*\*([^*]+?)\*\*)|(?:(?<=^|[\s.,!?;:(])\*([^*\s\n][^*]*?[^*\s\n]?)\*(?=$|[\s.,!?;:)]|\b))|(?:(?<=^|[\s.,!?;:(])_([^_ \n][^_]*?[^_ \n]?)_(?=$|[\s.,!?;:)]|\b))|(?:~~([^~]+?)~~)|(?:(?<=^|[\s.,!?;:(])~([^~\s\n][^~]*?[^~\s\n]?)~(?=$|[\s.,!?;:)]|\b))/g;

  const results: InlineToken[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = inlineRegex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      results.push({ type: "text", value: text.substring(lastIndex, match.index) });
    }

    if (match[1]) {
      results.push({ type: "link", label: match[2], href: match[3] });
    } else if (match[4]) {
      results.push({ type: "url", href: match[4] });
    } else if (match[5]) {
      results.push({ type: "code", value: match[6] });
    } else if (match[7]) {
      results.push({ type: "bold", value: match[7] });
    } else if (match[8]) {
      results.push({ type: "bold", value: match[8] });
    } else if (match[9]) {
      results.push({ type: "italic", value: match[9] });
    } else if (match[10]) {
      results.push({ type: "strike", value: match[10] });
    } else if (match[11]) {
      results.push({ type: "strike", value: match[11] });
    }

    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    results.push({ type: "text", value: text.substring(lastIndex) });
  }

  return results;
}

/**
 * Safely renders inline tokens into React JSX elements.
 * String values are escaped by React default rendering, preventing raw HTML/script injection.
 */
export function renderInline(tokens: InlineToken[]): React.ReactNode[] {
  return tokens.map((token, idx) => {
    switch (token.type) {
      case "bold":
        return (
          <strong key={idx} className="font-semibold text-inherit">
            {token.value}
          </strong>
        );
      case "italic":
        return (
          <em key={idx} className="italic text-inherit">
            {token.value}
          </em>
        );
      case "strike":
        return (
          <del key={idx} className="line-through opacity-85">
            {token.value}
          </del>
        );
      case "code":
        return (
          <code
            key={idx}
            className="font-mono text-[12.5px] bg-black/10 dark:bg-white/10 px-1 py-0.5 rounded text-[var(--wa-green)]"
          >
            {token.value}
          </code>
        );
      case "link": {
        const safe = isSafeUrl(token.href);
        if (!safe) return <span key={idx}>{token.label}</span>;
        return (
          <a
            key={idx}
            href={token.href}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sky-500 hover:text-sky-600 underline underline-offset-2 break-all"
            onClick={(e) => e.stopPropagation()}
          >
            {token.label}
          </a>
        );
      }
      case "url": {
        const safe = isSafeUrl(token.href);
        if (!safe) return <span key={idx}>{token.href}</span>;
        return (
          <a
            key={idx}
            href={token.href}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sky-500 hover:text-sky-600 underline underline-offset-2 break-all"
            onClick={(e) => e.stopPropagation()}
          >
            {token.href}
          </a>
        );
      }
      case "text":
      default:
        return <React.Fragment key={idx}>{token.value}</React.Fragment>;
    }
  });
}

/**
 * Splits multiline message content into structured blocks (lists, quotes, code blocks, paragraphs).
 */
export function parseMessageBlocks(content: string): MessageBlock[] {
  if (!content) return [];

  const lines = content.split("\n");
  const blocks: MessageBlock[] = [];
  let currentList: { type: "ul" | "ol"; items: string[] } | null = null;
  let inCodeBlock = false;
  let codeBlockLines: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Multiline Code Block: ```
    if (line.trim().startsWith("```")) {
      if (inCodeBlock) {
        blocks.push({ type: "codeblock", content: codeBlockLines.join("\n") });
        codeBlockLines = [];
        inCodeBlock = false;
      } else {
        if (currentList) {
          blocks.push(currentList);
          currentList = null;
        }
        inCodeBlock = true;
      }
      continue;
    }

    if (inCodeBlock) {
      codeBlockLines.push(line);
      continue;
    }

    // Unordered List (- , * , • )
    const ulMatch = line.match(/^(\s*)[-*•]\s+(.+)$/);
    if (ulMatch) {
      if (!currentList || currentList.type !== "ul") {
        if (currentList) blocks.push(currentList);
        currentList = { type: "ul", items: [] };
      }
      currentList.items.push(ulMatch[2]);
      continue;
    }

    // Ordered List (1. , 2. )
    const olMatch = line.match(/^(\s*)\d+\.\s+(.+)$/);
    if (olMatch) {
      if (!currentList || currentList.type !== "ol") {
        if (currentList) blocks.push(currentList);
        currentList = { type: "ol", items: [] };
      }
      currentList.items.push(olMatch[2]);
      continue;
    }

    // Not a list item: flush any active list
    if (currentList) {
      blocks.push(currentList);
      currentList = null;
    }

    // Blockquote (> )
    if (line.startsWith(">")) {
      blocks.push({ type: "quote", content: line.replace(/^>\s?/, "") });
      continue;
    }

    // Regular line
    blocks.push({ type: "line", content: line });
  }

  if (currentList) blocks.push(currentList);
  if (inCodeBlock && codeBlockLines.length) {
    blocks.push({ type: "codeblock", content: codeBlockLines.join("\n") });
  }

  return blocks;
}

/**
 * ChatMarkdown component: Renders WhatsApp & Markdown formatted text safely.
 * - Bold: *bold* or **bold**
 * - Italic: _italic_
 * - Strikethrough: ~strike~ or ~~strike~~
 * - Code: `code` or ```multiline code```
 * - Lists: - item, 1. item
 * - Links: [label](https://...) or https://...
 * - Protects against raw HTML injection (no dangerouslySetInnerHTML).
 */
export function ChatMarkdown({ content, className = "" }: ChatMarkdownProps) {
  const blocks = useMemo(() => parseMessageBlocks(content), [content]);

  return (
    <div className={`space-y-1.5 leading-[19px] ${className}`}>
      {blocks.map((block, bIdx) => {
        switch (block.type) {
          case "ul":
            return (
              <ul key={bIdx} className="list-disc list-outside pl-4 space-y-0.5 my-1">
                {block.items.map((item, iIdx) => (
                  <li key={iIdx} className="leading-[19px]">
                    {renderInline(parseInlineTokens(item))}
                  </li>
                ))}
              </ul>
            );
          case "ol":
            return (
              <ol key={bIdx} className="list-decimal list-outside pl-4 space-y-0.5 my-1">
                {block.items.map((item, iIdx) => (
                  <li key={iIdx} className="leading-[19px]">
                    {renderInline(parseInlineTokens(item))}
                  </li>
                ))}
              </ol>
            );
          case "quote":
            return (
              <blockquote
                key={bIdx}
                className="border-l-2 border-[var(--wa-green)] pl-2.5 my-1 text-[var(--text-secondary)] italic"
              >
                {renderInline(parseInlineTokens(block.content))}
              </blockquote>
            );
          case "codeblock":
            return (
              <pre
                key={bIdx}
                className="font-mono text-xs bg-black/15 dark:bg-white/10 p-2.5 rounded-lg overflow-x-auto my-1.5 whitespace-pre leading-snug"
              >
                <code>{block.content}</code>
              </pre>
            );
          case "line":
          default:
            if (!block.content) {
              return <div key={bIdx} className="h-1.5" />;
            }
            return (
              <div key={bIdx} className="whitespace-pre-wrap break-words leading-[19px]">
                {renderInline(parseInlineTokens(block.content))}
              </div>
            );
        }
      })}
    </div>
  );
}
