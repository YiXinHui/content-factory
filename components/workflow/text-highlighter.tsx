"use client";

import { cn } from "@/lib/utils";
import { useMemo } from "react";

interface TextHighlighterProps {
  text: string;
  highlights: string[];
  className?: string;
}

export function TextHighlighter({
  text,
  highlights,
  className,
}: TextHighlighterProps) {
  const highlightedText = useMemo(() => {
    if (!highlights.length) return text;

    // 创建一个标记数组，记录每个字符是否需要高亮
    const marks = new Array(text.length).fill(false);

    highlights.forEach((highlight) => {
      if (!highlight) return;
      let startIndex = 0;
      while (true) {
        const index = text.indexOf(highlight, startIndex);
        if (index === -1) break;
        for (let i = index; i < index + highlight.length; i++) {
          marks[i] = true;
        }
        startIndex = index + 1;
      }
    });

    // 根据标记生成高亮片段
    const segments: { text: string; highlighted: boolean }[] = [];
    let currentSegment = "";
    let currentHighlighted = marks[0];

    for (let i = 0; i < text.length; i++) {
      if (marks[i] === currentHighlighted) {
        currentSegment += text[i];
      } else {
        if (currentSegment) {
          segments.push({ text: currentSegment, highlighted: currentHighlighted });
        }
        currentSegment = text[i];
        currentHighlighted = marks[i];
      }
    }
    if (currentSegment) {
      segments.push({ text: currentSegment, highlighted: currentHighlighted });
    }

    return segments;
  }, [text, highlights]);

  if (typeof highlightedText === "string") {
    return (
      <div className={cn("whitespace-pre-wrap", className)}>{highlightedText}</div>
    );
  }

  return (
    <div className={cn("whitespace-pre-wrap leading-relaxed", className)}>
      {highlightedText.map((segment, index) => (
        <span
          key={index}
          className={cn(
            segment.highlighted &&
              "bg-yellow-200 dark:bg-yellow-900/50 px-0.5 rounded"
          )}
        >
          {segment.text}
        </span>
      ))}
    </div>
  );
}
