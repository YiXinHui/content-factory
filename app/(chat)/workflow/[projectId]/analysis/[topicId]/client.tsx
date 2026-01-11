"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Project, Topic, Analysis } from "@/lib/db/schema";
import { WorkflowLayout } from "@/components/workflow/workflow-layout";
import { AnalysisReport } from "@/components/workflow/analysis-report";
import { LoadingState, ErrorState } from "@/components/workflow/loading-state";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Clapperboard, FileText, ArrowRight, RefreshCw } from "lucide-react";

interface AnalysisClientProps {
  project: Project;
  topic: Topic;
  initialAnalysis: Analysis | null;
}

export function AnalysisClient({
  project,
  topic,
  initialAnalysis,
}: AnalysisClientProps) {
  const router = useRouter();
  const [analysis, setAnalysis] = useState<Analysis | null>(initialAnalysis);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 重新分析
  const handleReanalyze = async () => {
    setIsLoading(true);
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
      setAnalysis(data.analysis);
    } catch (err) {
      setError(err instanceof Error ? err.message : "分析失败，请重试");
    } finally {
      setIsLoading(false);
    }
  };

  // 选择路径
  const handleSelectPath = (path: "director" | "copywriter") => {
    if (!analysis) return;
    router.push(`/workflow/${project.id}/${path}/${analysis.id}`);
  };

  return (
    <WorkflowLayout
      projectId={project.id}
      projectTitle={project.title}
      currentStage="analysis"
      completedStages={["mining"]}
      topicId={topic.id}
    >
      <div className="space-y-6">
        {/* 主题信息 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span className="text-2xl">📊</span>
              {topic.title}
            </CardTitle>
            <CardDescription>{topic.coreIdea}</CardDescription>
          </CardHeader>
        </Card>

        {error && (
          <ErrorState message={error} onRetry={handleReanalyze} />
        )}

        {isLoading ? (
          <LoadingState message="内容分析师正在进行五步深度分析..." />
        ) : analysis ? (
          <>
            {/* 分析报告 */}
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">深度分析报告</h2>
              <Button variant="outline" size="sm" onClick={handleReanalyze}>
                <RefreshCw className="w-4 h-4 mr-1" />
                重新分析
              </Button>
            </div>
            <AnalysisReport analysis={analysis} />

            {/* 路径选择 */}
            <div className="mt-8">
              <h2 className="text-lg font-semibold mb-4">选择下一步</h2>
              <div className="grid md:grid-cols-2 gap-4">
                <Card
                  className="cursor-pointer hover:border-primary transition-colors"
                  onClick={() => handleSelectPath("director")}
                >
                  <CardHeader>
                    <div className="w-12 h-12 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center mb-2">
                      <Clapperboard className="w-6 h-6 text-orange-500" />
                    </div>
                    <CardTitle className="text-lg">A1 路径：编导</CardTitle>
                    <CardDescription>
                      生成短视频切片剪辑方案，包括剪辑结构、剪辑点定位、补录建议
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Button className="w-full">
                      选择编导路径
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </CardContent>
                </Card>

                <Card
                  className="cursor-pointer hover:border-primary transition-colors"
                  onClick={() => handleSelectPath("copywriter")}
                >
                  <CardHeader>
                    <div className="w-12 h-12 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mb-2">
                      <FileText className="w-6 h-6 text-green-500" />
                    </div>
                    <CardTitle className="text-lg">A2 路径：文案</CardTitle>
                    <CardDescription>
                      通过四步协作生成完整文案，包括公式选择、结构生成、标题创作、全文撰写
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Button className="w-full" variant="secondary">
                      选择文案路径
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </div>
          </>
        ) : (
          <LoadingState message="正在加载分析结果..." />
        )}
      </div>
    </WorkflowLayout>
  );
}
