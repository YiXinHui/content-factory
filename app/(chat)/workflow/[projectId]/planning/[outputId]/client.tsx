"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Project, Topic, Analysis, Output, NewTopic } from "@/lib/db/schema";
import { WorkflowLayout } from "@/components/workflow/workflow-layout";
import { LoadingState, ErrorState } from "@/components/workflow/loading-state";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Lightbulb, ArrowUp, ArrowDown, ArrowRight, RefreshCw, Home, Plus } from "lucide-react";

interface PlanningClientProps {
  project: Project;
  topic: Topic;
  analysis: Analysis;
  output: Output;
  initialNewTopics: NewTopic[];
}

const DIRECTION_CONFIG = {
  up: {
    label: "原因探究",
    icon: ArrowUp,
    color: "bg-blue-500",
    bgColor: "bg-blue-50 dark:bg-blue-950/30",
    borderColor: "border-blue-200 dark:border-blue-900",
  },
  down: {
    label: "结果预测",
    icon: ArrowDown,
    color: "bg-green-500",
    bgColor: "bg-green-50 dark:bg-green-950/30",
    borderColor: "border-green-200 dark:border-green-900",
  },
  parallel: {
    label: "相关场景",
    icon: ArrowRight,
    color: "bg-purple-500",
    bgColor: "bg-purple-50 dark:bg-purple-950/30",
    borderColor: "border-purple-200 dark:border-purple-900",
  },
};

export function PlanningClient({
  project,
  topic,
  analysis,
  output,
  initialNewTopics,
}: PlanningClientProps) {
  const router = useRouter();
  const [newTopics, setNewTopics] = useState<NewTopic[]>(initialNewTopics);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 生成新选题
  const handleGenerate = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/workflow/planning", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ outputId: output.id }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "生成失败");
      }

      const data = await response.json();
      setNewTopics(data.newTopics);
    } catch (err) {
      setError(err instanceof Error ? err.message : "生成失败，请重试");
    } finally {
      setIsLoading(false);
    }
  };

  // 使用新选题开始新一轮
  const handleUseNewTopic = async (newTopic: NewTopic) => {
    // 创建新项目并跳转
    try {
      const response = await fetch("/api/workflow", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: newTopic.title,
          originalText: `基于选题"${newTopic.title}"的内容创作\n\n发散方向：${newTopic.directionLabel}\n说明：${newTopic.description}\n切入角度：${newTopic.potentialAngle || "待定"}\n\n请在此处粘贴相关的录音转写文本...`,
        }),
      });

      if (!response.ok) {
        throw new Error("创建项目失败");
      }

      const newProject = await response.json();
      router.push(`/workflow/${newProject.id}/mining`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "创建项目失败");
    }
  };

  // 返回首页
  const handleGoHome = () => {
    router.push("/");
  };

  // 按方向分组选题
  const groupedTopics = newTopics.reduce(
    (acc, topic) => {
      const direction = topic.direction as keyof typeof DIRECTION_CONFIG;
      if (!acc[direction]) acc[direction] = [];
      acc[direction].push(topic);
      return acc;
    },
    {} as Record<string, NewTopic[]>
  );

  return (
    <WorkflowLayout
      projectId={project.id}
      projectTitle={project.title}
      currentStage="planning"
      completedStages={["mining", "analysis", output.type === "director" ? "director" : "copywriter"]}
      topicId={topic.id}
      analysisId={analysis.id}
      outputId={output.id}
    >
      <div className="space-y-6">
        {/* 完成提示 */}
        <Card className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/30 border-green-200 dark:border-green-900">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-green-500 flex items-center justify-center">
                <span className="text-2xl">🎉</span>
              </div>
              <div>
                <CardTitle className="text-green-700 dark:text-green-300">
                  恭喜完成内容创作！
                </CardTitle>
                <CardDescription>
                  您已完成"{topic.title}"的{output.type === "director" ? "剪辑方案" : "文案"}创作
                </CardDescription>
              </div>
            </div>
          </CardHeader>
        </Card>

        {error && <ErrorState message={error} onRetry={handleGenerate} />}

        {isLoading ? (
          <LoadingState message="选题策划正在发散新的选题方向..." />
        ) : newTopics.length === 0 ? (
          <div className="text-center py-12">
            <Lightbulb className="w-12 h-12 mx-auto text-primary mb-4" />
            <h3 className="text-lg font-medium mb-2">发散新选题</h3>
            <p className="text-muted-foreground mb-6">
              选题策划将围绕您刚完成的内容，向三个方向发散新的选题
            </p>
            <Button onClick={handleGenerate} size="lg">
              开始发散
            </Button>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">新选题建议</h2>
              <Button variant="outline" size="sm" onClick={handleGenerate}>
                <RefreshCw className="w-4 h-4 mr-1" />
                重新发散
              </Button>
            </div>

            {/* 按方向分组展示 */}
            <div className="space-y-6">
              {(["up", "down", "parallel"] as const).map((direction) => {
                const topics = groupedTopics[direction] || [];
                if (topics.length === 0) return null;

                const config = DIRECTION_CONFIG[direction];
                const Icon = config.icon;

                return (
                  <div key={direction}>
                    <div className="flex items-center gap-2 mb-3">
                      <div
                        className={cn(
                          "w-8 h-8 rounded-full flex items-center justify-center text-white",
                          config.color
                        )}
                      >
                        <Icon className="w-4 h-4" />
                      </div>
                      <h3 className="font-medium">{config.label}</h3>
                    </div>
                    <div className="grid md:grid-cols-2 gap-4">
                      {topics.map((newTopic) => (
                        <Card
                          key={newTopic.id}
                          className={cn(
                            "transition-all hover:shadow-md",
                            config.bgColor,
                            config.borderColor
                          )}
                        >
                          <CardHeader className="pb-2">
                            <CardTitle className="text-base">{newTopic.title}</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <p className="text-sm text-muted-foreground mb-3">
                              {newTopic.description}
                            </p>
                            {newTopic.potentialAngle && (
                              <div className="text-xs text-muted-foreground mb-3">
                                <span className="font-medium">切入角度：</span>
                                {newTopic.potentialAngle}
                              </div>
                            )}
                            <Button
                              size="sm"
                              variant="outline"
                              className="w-full"
                              onClick={() => handleUseNewTopic(newTopic)}
                            >
                              <Plus className="w-4 h-4 mr-1" />
                              用此选题开始新一轮
                            </Button>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* 操作按钮 */}
            <div className="flex justify-center gap-4 pt-6">
              <Button variant="outline" onClick={handleGoHome}>
                <Home className="w-4 h-4 mr-2" />
                返回首页
              </Button>
              <Button onClick={() => router.push(`/workflow/${project.id}/mining`)}>
                查看项目详情
              </Button>
            </div>
          </>
        )}
      </div>
    </WorkflowLayout>
  );
}
