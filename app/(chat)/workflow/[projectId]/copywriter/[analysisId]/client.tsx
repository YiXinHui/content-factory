"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Project, Topic, Analysis, Output, CopywriterContent, CopywriterFormula, CopywriterTitle } from "@/lib/db/schema";
import { WorkflowLayout } from "@/components/workflow/workflow-layout";
import { LoadingState, ErrorState } from "@/components/workflow/loading-state";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { Check, ChevronRight, Sparkles, FileText, Heading, PenTool } from "lucide-react";
import ReactMarkdown from "react-markdown";

interface CopywriterClientProps {
  project: Project;
  topic: Topic;
  analysis: Analysis;
  initialOutput: Output | null;
}

const STEPS = [
  { id: 1, title: "选择公式", icon: Sparkles, description: "选择最适合的文案结构公式" },
  { id: 2, title: "生成结构", icon: FileText, description: "生成文章骨架" },
  { id: 3, title: "创作标题", icon: Heading, description: "生成吸睛标题" },
  { id: 4, title: "撰写全文", icon: PenTool, description: "生成完整文案" },
];

export function CopywriterClient({
  project,
  topic,
  analysis,
  initialOutput,
}: CopywriterClientProps) {
  const router = useRouter();
  const [output, setOutput] = useState<Output | null>(initialOutput);
  const [currentStep, setCurrentStep] = useState(
    initialOutput?.copywriterContent?.currentStep || 1
  );
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 选中的公式和标题
  const [selectedFormula, setSelectedFormula] = useState<CopywriterFormula | null>(
    output?.copywriterContent?.selectedFormula || null
  );
  const [selectedTitle, setSelectedTitle] = useState<CopywriterTitle | null>(
    output?.copywriterContent?.selectedTitle || null
  );

  const content = output?.copywriterContent as CopywriterContent | undefined;

  // 执行步骤
  const executeStep = async (step: number, extraData?: any) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/workflow/copywriter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          analysisId: analysis.id,
          step,
          ...extraData,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "生成失败");
      }

      const data = await response.json();
      setOutput(data.output);
      setCurrentStep(step);

      // 如果是最后一步，可以跳转到选题策划
      if (step === 4 && data.output) {
        // 保持在当前页面显示结果
      }
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

  // 渲染步骤指示器
  const renderStepIndicator = () => (
    <div className="flex items-center justify-center mb-8">
      {STEPS.map((step, index) => (
        <div key={step.id} className="flex items-center">
          <div
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-lg transition-all",
              currentStep === step.id && "bg-primary/10 ring-2 ring-primary",
              currentStep > step.id && "bg-green-100 dark:bg-green-900/30",
              currentStep < step.id && "opacity-50"
            )}
          >
            <div
              className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center text-sm",
                currentStep === step.id && "bg-primary text-primary-foreground",
                currentStep > step.id && "bg-green-500 text-white",
                currentStep < step.id && "bg-muted"
              )}
            >
              {currentStep > step.id ? <Check className="w-4 h-4" /> : step.id}
            </div>
            <span className="hidden md:inline text-sm font-medium">{step.title}</span>
          </div>
          {index < STEPS.length - 1 && (
            <div
              className={cn(
                "w-8 h-0.5 mx-2",
                currentStep > step.id ? "bg-green-500" : "bg-muted"
              )}
            />
          )}
        </div>
      ))}
    </div>
  );

  // 渲染步骤内容
  const renderStepContent = () => {
    if (isLoading) {
      const messages = [
        "文案正在推荐最适合的结构公式...",
        "文案正在生成文章骨架...",
        "文案正在创作吸睛标题...",
        "文案正在撰写完整内容...",
      ];
      return <LoadingState message={messages[currentStep - 1]} />;
    }

    switch (currentStep) {
      case 1:
        return renderFormulaSelection();
      case 2:
        return renderStructureEditor();
      case 3:
        return renderTitleGenerator();
      case 4:
        return renderContentEditor();
      default:
        return null;
    }
  };

  // Step 1: 公式选择
  const renderFormulaSelection = () => {
    const formulas = content?.formulas || [];

    if (formulas.length === 0) {
      return (
        <div className="text-center py-12">
          <Sparkles className="w-12 h-12 mx-auto text-primary mb-4" />
          <h3 className="text-lg font-medium mb-2">开始文案创作</h3>
          <p className="text-muted-foreground mb-6">
            文案将为您推荐 3 种最适合的结构公式
          </p>
          <Button onClick={() => executeStep(1)} size="lg">
            推荐公式
          </Button>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        <h3 className="text-lg font-medium">选择文案结构公式</h3>
        <div className="grid md:grid-cols-3 gap-4">
          {formulas.map((formula, index) => (
            <Card
              key={index}
              className={cn(
                "cursor-pointer transition-all hover:shadow-md",
                selectedFormula?.name === formula.name && "ring-2 ring-primary"
              )}
              onClick={() => setSelectedFormula(formula)}
            >
              <CardHeader>
                <CardTitle className="text-base">{formula.name}</CardTitle>
                <CardDescription className="text-sm">
                  {formula.description}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-sm">
                  <div className="text-muted-foreground mb-2">适合原因：</div>
                  <p className="text-foreground">{formula.whyFit}</p>
                </div>
                <div className="mt-3 text-xs text-muted-foreground">
                  示例：{formula.example}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
        <div className="flex justify-end mt-6">
          <Button
            onClick={() => executeStep(2, { selectedFormula })}
            disabled={!selectedFormula}
          >
            使用此公式
            <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        </div>
      </div>
    );
  };

  // Step 2: 结构编辑
  const renderStructureEditor = () => {
    const structure = content?.structure || [];
    const totalWords = content?.totalEstimatedWords || 0;

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium">文章结构骨架</h3>
          <Badge variant="secondary">预计 {totalWords} 字</Badge>
        </div>
        <div className="space-y-3">
          {structure.map((section: any, index: number) => (
            <Card key={index}>
              <CardHeader className="py-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-primary/10 text-primary text-sm flex items-center justify-center">
                      {index + 1}
                    </span>
                    {section.section}
                  </CardTitle>
                  <Badge variant="outline">{section.estimatedWords} 字</Badge>
                </div>
                <CardDescription>{section.subtitle}</CardDescription>
              </CardHeader>
              <CardContent className="py-2">
                <div className="flex flex-wrap gap-2">
                  {section.keyPoints.map((point: string, i: number) => (
                    <Badge key={i} variant="secondary">
                      {point}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
        <div className="flex justify-end mt-6">
          <Button onClick={() => executeStep(3)}>
            生成标题
            <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        </div>
      </div>
    );
  };

  // Step 3: 标题生成
  const renderTitleGenerator = () => {
    const titles = content?.titles || [];

    return (
      <div className="space-y-4">
        <h3 className="text-lg font-medium">选择标题</h3>
        <div className="grid gap-3">
          {titles.map((title: CopywriterTitle, index: number) => (
            <Card
              key={index}
              className={cn(
                "cursor-pointer transition-all hover:shadow-md",
                selectedTitle?.title === title.title && "ring-2 ring-primary"
              )}
              onClick={() => setSelectedTitle(title)}
            >
              <CardContent className="py-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <p className="font-medium text-lg">{title.title}</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      {title.hook}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {title.elements.map((element, i) => (
                      <Badge key={i} variant="outline" className="text-xs">
                        {element}
                      </Badge>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
        <div className="flex justify-end mt-6">
          <Button
            onClick={() => executeStep(4, { selectedTitle })}
            disabled={!selectedTitle}
          >
            生成全文
            <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        </div>
      </div>
    );
  };

  // Step 4: 全文展示
  const renderContentEditor = () => {
    const fullContent = content?.fullContent || "";

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium">完整文案</h3>
          <Button variant="outline" size="sm" onClick={handleGoToPlanning}>
            进入选题策划
            <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>{selectedTitle?.title || content?.selectedTitle?.title}</CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[500px]">
              <div className="prose prose-sm dark:prose-invert max-w-none">
                <ReactMarkdown>{fullContent}</ReactMarkdown>
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    );
  };

  return (
    <WorkflowLayout
      projectId={project.id}
      projectTitle={project.title}
      currentStage="copywriter"
      completedStages={["mining", "analysis"]}
      topicId={topic.id}
      analysisId={analysis.id}
    >
      <div className="space-y-6">
        {/* 主题信息 */}
        <Card>
          <CardHeader className="py-4">
            <div className="flex items-center gap-2">
              <span className="text-xl">✍️</span>
              <div>
                <CardTitle className="text-lg">{topic.title}</CardTitle>
                <CardDescription className="text-sm">
                  核心论点：{analysis.coreArgument}
                </CardDescription>
              </div>
            </div>
          </CardHeader>
        </Card>

        {error && <ErrorState message={error} onRetry={() => executeStep(currentStep)} />}

        {/* 步骤指示器 */}
        {renderStepIndicator()}

        {/* 步骤内容 */}
        {renderStepContent()}
      </div>
    </WorkflowLayout>
  );
}
