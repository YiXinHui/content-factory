"use client";

import { cn } from "@/lib/utils";
import type { Topic } from "@/lib/db/schema";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChevronRight, Quote, BarChart3, BookOpen } from "lucide-react";

interface TopicCardProps {
  topic: Topic;
  isSelected?: boolean;
  onSelect?: () => void;
  onAnalyze?: () => void;
  isLoading?: boolean;
}

export function TopicCard({
  topic,
  isSelected,
  onSelect,
  onAnalyze,
  isLoading,
}: TopicCardProps) {
  const materials = topic.supportMaterials as {
    cases: number;
    quotes: number;
    data: number;
  };

  return (
    <div
      className={cn(
        "p-4 rounded-lg border bg-card transition-all cursor-pointer hover:shadow-md",
        isSelected && "ring-2 ring-primary border-primary"
      )}
      onClick={onSelect}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-lg truncate">{topic.title}</h3>
          <p className="text-muted-foreground text-sm mt-1 line-clamp-2">
            {topic.coreIdea}
          </p>
        </div>
      </div>

      {/* 情感浓度 */}
      <div className="mt-4">
        <div className="flex items-center justify-between text-sm mb-1">
          <span className="text-muted-foreground">情感浓度</span>
          <span className="font-medium">{topic.emotionLevel}/5</span>
        </div>
        <Progress value={topic.emotionLevel * 20} className="h-2" />
      </div>

      {/* 支撑素材标签 */}
      <div className="flex flex-wrap gap-2 mt-4">
        {materials.cases > 0 && (
          <Badge variant="secondary" className="flex items-center gap-1">
            <BookOpen className="w-3 h-3" />
            {materials.cases} 案例
          </Badge>
        )}
        {materials.quotes > 0 && (
          <Badge variant="secondary" className="flex items-center gap-1">
            <Quote className="w-3 h-3" />
            {materials.quotes} 金句
          </Badge>
        )}
        {materials.data > 0 && (
          <Badge variant="secondary" className="flex items-center gap-1">
            <BarChart3 className="w-3 h-3" />
            {materials.data} 数据
          </Badge>
        )}
      </div>

      {/* 挖掘理由 */}
      {topic.reason && (
        <p className="text-xs text-muted-foreground mt-3 italic">
          💡 {topic.reason}
        </p>
      )}

      {/* 操作按钮 */}
      <Button
        className="w-full mt-4"
        onClick={(e) => {
          e.stopPropagation();
          onAnalyze?.();
        }}
        disabled={isLoading}
      >
        {isLoading ? (
          "分析中..."
        ) : (
          <>
            深度分析此主题
            <ChevronRight className="w-4 h-4 ml-1" />
          </>
        )}
      </Button>
    </div>
  );
}
