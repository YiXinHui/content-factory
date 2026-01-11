"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Project } from "@/lib/db/schema";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { DIGITAL_EMPLOYEES } from "@/lib/ai/workflow-prompts";
import { cn } from "@/lib/utils";
import {
  Factory,
  Sparkles,
  Clock,
  ChevronRight,
  FileText,
  Loader2,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { zhCN } from "date-fns/locale";

interface FactoryClientProps {
  initialProjects: Project[];
}

const STAGE_LABELS: Record<string, string> = {
  mining: "内容挖掘中",
  analysis: "深度分析中",
  director: "编导设计中",
  copywriter: "文案创作中",
  planning: "选题策划中",
  completed: "已完成",
};

export function FactoryClient({ initialProjects }: FactoryClientProps) {
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>(initialProjects);
  const [title, setTitle] = useState("");
  const [text, setText] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 创建新项目
  const handleCreate = async () => {
    if (!text.trim() || text.length < 10) {
      setError("请输入至少 10 个字符的文本");
      return;
    }

    setIsCreating(true);
    setError(null);

    try {
      const projectTitle = title.trim() || `项目 ${new Date().toLocaleDateString("zh-CN")}`;

      const response = await fetch("/api/workflow", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: projectTitle,
          originalText: text,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "创建失败");
      }

      const project = await response.json();
      router.push(`/workflow/${project.id}/mining`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "创建失败，请重试");
      setIsCreating(false);
    }
  };

  // 继续项目
  const handleContinue = (project: Project) => {
    router.push(`/workflow/${project.id}`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      {/* 头部 */}
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center">
              <Factory className="w-6 h-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="font-bold text-xl">流淌内容工厂</h1>
              <p className="text-xs text-muted-foreground">让 AI 隐形，让智能可见</p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-2 gap-8">
          {/* 左侧：文本输入 */}
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold mb-2">开始创作</h2>
              <p className="text-muted-foreground">
                粘贴您的录音转写文本，AI 数字员工将帮您挖掘高价值主题
              </p>
            </div>

            <Card>
              <CardContent className="pt-6 space-y-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">
                    项目标题（可选）
                  </label>
                  <Input
                    placeholder="给您的项目起个名字..."
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                  />
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">
                    录音转写文本 <span className="text-destructive">*</span>
                  </label>
                  <Textarea
                    placeholder="在这里粘贴您的录音转写文本...&#10;&#10;支持任何形式的文字内容：演讲稿、访谈记录、会议纪要、课程内容等"
                    className="min-h-[300px] resize-none"
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                  />
                  <div className="flex justify-between mt-2 text-xs text-muted-foreground">
                    <span>已输入 {text.length} 字符</span>
                    <span>建议 500-5000 字</span>
                  </div>
                </div>

                {error && (
                  <div className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded">
                    {error}
                  </div>
                )}

                <Button
                  className="w-full"
                  size="lg"
                  onClick={handleCreate}
                  disabled={isCreating || text.length < 10}
                >
                  {isCreating ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      创建中...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 mr-2" />
                      开始内容挖掘
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>

            {/* 数字员工介绍 */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">5 位数字员工为您服务</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-5 gap-2">
                  {Object.entries(DIGITAL_EMPLOYEES).map(([key, employee]) => (
                    <div
                      key={key}
                      className="text-center p-2 rounded-lg bg-muted/50"
                    >
                      <div
                        className={cn(
                          "w-10 h-10 rounded-full mx-auto flex items-center justify-center text-white mb-1",
                          employee.color
                        )}
                      >
                        {employee.icon}
                      </div>
                      <div className="text-xs font-medium truncate">
                        {employee.name}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* 右侧：历史项目 */}
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold">历史项目</h2>
              <Badge variant="secondary">{projects.length} 个项目</Badge>
            </div>

            {projects.length === 0 ? (
              <Card className="border-dashed">
                <CardContent className="py-12 text-center">
                  <FileText className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
                  <p className="text-muted-foreground">
                    还没有项目，开始您的第一次创作吧！
                  </p>
                </CardContent>
              </Card>
            ) : (
              <ScrollArea className="h-[600px]">
                <div className="space-y-3 pr-4">
                  {projects.map((project) => (
                    <Card
                      key={project.id}
                      className="cursor-pointer hover:shadow-md transition-all"
                      onClick={() => handleContinue(project)}
                    >
                      <CardContent className="py-4">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <h3 className="font-medium truncate">
                              {project.title}
                            </h3>
                            <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                              {project.originalText.slice(0, 100)}...
                            </p>
                            <div className="flex items-center gap-3 mt-2">
                              <Badge
                                variant={
                                  project.currentStage === "completed"
                                    ? "default"
                                    : "secondary"
                                }
                                className="text-xs"
                              >
                                {STAGE_LABELS[project.currentStage] || project.currentStage}
                              </Badge>
                              <span className="text-xs text-muted-foreground flex items-center">
                                <Clock className="w-3 h-3 mr-1" />
                                {formatDistanceToNow(new Date(project.updatedAt), {
                                  addSuffix: true,
                                  locale: zhCN,
                                })}
                              </span>
                            </div>
                          </div>
                          <ChevronRight className="w-5 h-5 text-muted-foreground shrink-0" />
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </ScrollArea>
            )}
          </div>
        </div>
      </main>

      {/* 页脚 */}
      <footer className="border-t mt-12">
        <div className="max-w-6xl mx-auto px-4 py-6 text-center text-sm text-muted-foreground">
          <p>流淌内容工厂 - 让知识型 IP 的内容创作更高效</p>
        </div>
      </footer>
    </div>
  );
}
