"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Project, Topic, Analysis, Output, DirectorContent } from "@/lib/db/schema";
import { WorkflowLayout } from "@/components/workflow/workflow-layout";
import { TextHighlighter } from "@/components/workflow/text-highlighter";
import { LoadingState, ErrorState } from "@/components/workflow/loading-state";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Clapperboard, Clock, Mic, ChevronRight, RefreshCw } from "lucide-react";

interface DirectorClientProps {
  project: Project;
  topic: Topic;
  analysis: Analysis;
  initialOutput: Output | null;
}

export function DirectorClient({
  project,
  topic,
  analysis,
  initialOutput,
}: DirectorClientProps) {
  const router = useRouter();
  const [output, setOutput] = useState<Output | null>(initialOutput);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedClipIndex, setSelectedClipIndex] = useState<number | null>(null);

  const content = output?.directorContent as DirectorContent | undefined;

  // 获取当前选中剪辑点的高亮文本
  const highlights =
    selectedClipIndex !== null && content?.clipPoints[selectedClipIndex]
      ? [content.clipPoints[selectedClipIndex].originalText]
      : [];

  // 生成剪辑方案
  const handleGenerate = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/workflow/director", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ analysisId: analysis.id }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "生成失败");
      }

      const data = await response.json();
      setOutput(data.output);
    } catch (err) {
      setError(err instanceof Error ? err.message : "生成失败，请重试");
    } finally {
      setIsLoading(false);
    }
  };

  // 进入选题策划
  const handleGoToPlanning = () => {
    if (output) {
      router.push(`/workflow/${project.id}/planning/${output.id}`);
    }
  };

  // 获取内容类型的颜色
  const getContentTypeColor = (type: string) => {
    switch (type) {
      case "观点类":
        return "bg-purple-500";
      case "知识类":
        return "bg-blue-500";
      case "故事类":
        return "bg-orange-500";
      default:
        return "bg-gray-500";
    }
  };

  return (
    <WorkflowLayout
      projectId={project.id}
      projectTitle={project.title}
      currentStage="director"
      completedStages={["mining", "analysis"]}
      topicId={topic.id}
      analysisId={analysis.id}
    >
      <div className="space-y-6">
        {/* 主题信息 */}
        <Card>
          <CardHeader className="py-4">
            <div className="flex items-center gap-2">
              <span className="text-xl">🎬</span>
              <div>
                <CardTitle className="text-lg">{topic.title}</CardTitle>
                <CardDescription className="text-sm">
                  核心论点：{analysis.coreArgument}
                </CardDescription>
              </div>
            </div>
          </CardHeader>
        </Card>

        {error && <ErrorState message={error} onRetry={handleGenerate} />}

        {isLoading ? (
          <LoadingState message="编导正在设计短视频切片剪辑方案..." />
        ) : !content ? (
          <div className="text-center py-12">
            <Clapperboard className="w-12 h-12 mx-auto text-primary mb-4" />
            <h3 className="text-lg font-medium mb-2">生成剪辑方案</h3>
            <p className="text-muted-foreground mb-6">
              编导将为您设计一份可直接执行的短视频切片剪辑方案
            </p>
            <Button onClick={handleGenerate} size="lg">
              开始设计
            </Button>
          </div>
        ) : (
          <div className="grid lg:grid-cols-2 gap-6">
            {/* 左侧：原文和剪辑点 */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-medium">原文与剪辑点</h3>
                <Button variant="outline" size="sm" onClick={handleGenerate}>
                  <RefreshCw className="w-4 h-4 mr-1" />
                  重新生成
                </Button>
              </div>
              <ScrollArea className="h-[400px] border rounded-lg p-4 bg-muted/20">
                <TextHighlighter
                  text={project.originalText}
                  highlights={highlights}
                  className="text-sm"
                />
              </ScrollArea>

              {/* 剪辑点列表 */}
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-muted-foreground">
                  点击查看剪辑点在原文中的位置
                </h4>
                <div className="flex flex-wrap gap-2">
                  {content.clipPoints.map((clip, index) => (
                    <Badge
                      key={index}
                      variant={selectedClipIndex === index ? "default" : "outline"}
                      className="cursor-pointer"
                      onClick={() => setSelectedClipIndex(index)}
                    >
                      {clip.part}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>

            {/* 右侧：剪辑方案详情 */}
            <div className="space-y-4">
              {/* 内容类型和结构 */}
              <Card>
                <CardHeader className="py-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">剪辑方案</CardTitle>
                    <Badge className={getContentTypeColor(content.contentType)}>
                      {content.contentType}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div>
                      <div className="text-sm text-muted-foreground">推荐结构</div>
                      <div className="font-medium">{content.structure.name}</div>
                      <div className="text-sm text-muted-foreground mt-1">
                        {content.structure.description}
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {content.structure.parts.map((part, index) => (
                        <Badge key={index} variant="secondary">
                          {index + 1}. {part}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* 剪辑点详情 */}
              <Card>
                <CardHeader className="py-3">
                  <CardTitle className="text-base">剪辑点详情</CardTitle>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[200px]">
                    <div className="space-y-3">
                      {content.clipPoints.map((clip, index) => (
                        <div
                          key={index}
                          className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                            selectedClipIndex === index
                              ? "border-primary bg-primary/5"
                              : "hover:bg-muted/50"
                          }`}
                          onClick={() => setSelectedClipIndex(index)}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <Badge variant="outline">{clip.part}</Badge>
                            <div className="flex items-center text-sm text-muted-foreground">
                              <Clock className="w-3 h-3 mr-1" />
                              {clip.duration}
                            </div>
                          </div>
                          <div className="text-sm text-muted-foreground mb-1">
                            {clip.purpose}
                          </div>
                          <div className="text-sm line-clamp-2">
                            "{clip.originalText}"
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>

              {/* 补录建议 */}
              <Card>
                <CardHeader className="py-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Mic className="w-4 h-4" />
                    补录建议
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {content.rerecordSuggestions.map((suggestion, index) => (
                      <div key={index} className="p-2 bg-muted/50 rounded text-sm">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant="outline" className="text-xs">
                            {suggestion.type}
                          </Badge>
                          <span className="text-muted-foreground text-xs">
                            {suggestion.position}
                          </span>
                        </div>
                        <p>"{suggestion.content}"</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* 成品预览 */}
              <Card>
                <CardHeader className="py-3">
                  <CardTitle className="text-base">成品预览</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">{content.preview}</p>
                </CardContent>
              </Card>

              {/* 下一步 */}
              <Button className="w-full" onClick={handleGoToPlanning}>
                进入选题策划
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </WorkflowLayout>
  );
}
