"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Project, Topic } from "@/lib/db/schema";
import { WorkflowLayout } from "@/components/workflow/workflow-layout";
import { TopicCard } from "@/components/workflow/topic-card";
import { TextHighlighter } from "@/components/workflow/text-highlighter";
import { LoadingState, ErrorState } from "@/components/workflow/loading-state";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sparkles, RefreshCw } from "lucide-react";

interface MiningClientProps {
  project: Project;
  initialTopics: Topic[];
}

export function MiningClient({ project, initialTopics }: MiningClientProps) {
  const router = useRouter();
  const [topics, setTopics] = useState<Topic[]>(initialTopics);
  const [selectedTopic, setSelectedTopic] = useState<Topic | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // 获取当前选中主题的高亮文本
  const highlights = selectedTopic?.highlightedText as string[] || [];

  // 开始内容挖掘
  const handleMining = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/workflow/mining", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId: project.id }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "挖掘失败");
      }

      const data = await response.json();
      setTopics(data.topics);
    } catch (err) {
      setError(err instanceof Error ? err.message : "挖掘失败，请重试");
    } finally {
      setIsLoading(false);
    }
  };

  // 深度分析主题
  const handleAnalyze = async (topic: Topic) => {
    setIsAnalyzing(topic.id);
    setError(null);

    try {
      const response = await fetch("/api/workflow/analysis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topicId: topic.id }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "分析失败");
      }

      const data = await response.json();
      // 跳转到分析页面
      router.push(`/workflow/${project.id}/analysis/${topic.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "分析失败，请重试");
      setIsAnalyzing(null);
    }
  };

  return (
    <WorkflowLayout
      projectId={project.id}
      projectTitle={project.title}
      currentStage="mining"
      completedStages={[]}
    >
      <div className="grid lg:grid-cols-2 gap-6 h-[calc(100vh-220px)]">
        {/* 左侧：原文展示 */}
        <div className="flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">原始文本</h2>
            {selectedTopic && (
              <span className="text-sm text-muted-foreground">
                点击主题卡片查看相关段落高亮
              </span>
            )}
          </div>
          <ScrollArea className="flex-1 border rounded-lg p-4 bg-muted/20">
            <TextHighlighter
              text={project.originalText}
              highlights={highlights}
              className="text-sm"
            />
          </ScrollArea>
        </div>

        {/* 右侧：主题卡片 */}
        <div className="flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">
              {topics.length > 0 ? `发现 ${topics.length} 个高价值主题` : "内容挖掘"}
            </h2>
            {topics.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleMining}
                disabled={isLoading}
              >
                <RefreshCw className={`w-4 h-4 mr-1 ${isLoading ? "animate-spin" : ""}`} />
                重新挖掘
              </Button>
            )}
          </div>

          {error && (
            <ErrorState message={error} onRetry={handleMining} className="mb-4" />
          )}

          {isLoading ? (
            <LoadingState message="内容挖掘师正在分析文本，挖掘高价值主题..." />
          ) : topics.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center border rounded-lg bg-muted/20 p-8">
              <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                <Sparkles className="w-10 h-10 text-primary" />
              </div>
              <h3 className="text-lg font-medium mb-2">开始内容挖掘</h3>
              <p className="text-muted-foreground text-center mb-6 max-w-sm">
                内容挖掘师将从您的文本中发现 3-5 个最具潜力的高价值主题
              </p>
              <Button onClick={handleMining} size="lg">
                <Sparkles className="w-4 h-4 mr-2" />
                开始挖掘
              </Button>
            </div>
          ) : (
            <ScrollArea className="flex-1">
              <div className="grid gap-4 pr-4">
                {topics.map((topic) => (
                  <TopicCard
                    key={topic.id}
                    topic={topic}
                    isSelected={selectedTopic?.id === topic.id}
                    onSelect={() => setSelectedTopic(topic)}
                    onAnalyze={() => handleAnalyze(topic)}
                    isLoading={isAnalyzing === topic.id}
                  />
                ))}
              </div>
            </ScrollArea>
          )}
        </div>
      </div>
    </WorkflowLayout>
  );
}
