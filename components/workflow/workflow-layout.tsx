"use client";

import { ProgressBar } from "./progress-bar";
import { DIGITAL_EMPLOYEES, type WorkflowStage } from "@/lib/ai/workflow-prompts";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

interface WorkflowLayoutProps {
  projectId: string;
  projectTitle: string;
  currentStage: WorkflowStage;
  completedStages: WorkflowStage[];
  topicId?: string;
  analysisId?: string;
  outputId?: string;
  children: React.ReactNode;
}

export function WorkflowLayout({
  projectId,
  projectTitle,
  currentStage,
  completedStages,
  topicId,
  analysisId,
  outputId,
  children,
}: WorkflowLayoutProps) {
  const employee = DIGITAL_EMPLOYEES[currentStage];

  return (
    <div className="min-h-screen flex flex-col">
      {/* 顶部导航 */}
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href="/"
              className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="hidden sm:inline">返回首页</span>
            </Link>
            <div className="h-4 w-px bg-border" />
            <h1 className="font-semibold truncate max-w-[200px] md:max-w-none">
              {projectTitle}
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <span
              className={cn(
                "px-3 py-1 rounded-full text-sm font-medium text-white",
                employee.color
              )}
            >
              {employee.icon} {employee.name}
            </span>
          </div>
        </div>
      </header>

      {/* 进度条 */}
      <ProgressBar
        projectId={projectId}
        currentStage={currentStage}
        completedStages={completedStages}
        topicId={topicId}
        analysisId={analysisId}
        outputId={outputId}
      />

      {/* 主内容区 */}
      <main className="flex-1 max-w-6xl mx-auto w-full px-4 py-6">
        {children}
      </main>
    </div>
  );
}
