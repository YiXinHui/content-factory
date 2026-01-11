"use client";

import { cn } from "@/lib/utils";
import { DIGITAL_EMPLOYEES, type WorkflowStage } from "@/lib/ai/workflow-prompts";
import Link from "next/link";

interface ProgressBarProps {
  projectId: string;
  currentStage: WorkflowStage | "completed";
  completedStages: WorkflowStage[];
  topicId?: string;
  analysisId?: string;
  outputId?: string;
}

const STAGE_ORDER: (WorkflowStage | "completed")[] = [
  "mining",
  "analysis",
  "director",
  "copywriter",
  "planning",
  "completed",
];

export function ProgressBar({
  projectId,
  currentStage,
  completedStages,
  topicId,
  analysisId,
  outputId,
}: ProgressBarProps) {
  const currentIndex = STAGE_ORDER.indexOf(currentStage);

  const getStageLink = (stage: WorkflowStage) => {
    const basePath = `/workflow/${projectId}`;
    switch (stage) {
      case "mining":
        return `${basePath}/mining`;
      case "analysis":
        return topicId ? `${basePath}/analysis/${topicId}` : null;
      case "director":
        return analysisId ? `${basePath}/director/${analysisId}` : null;
      case "copywriter":
        return analysisId ? `${basePath}/copywriter/${analysisId}` : null;
      case "planning":
        return outputId ? `${basePath}/planning/${outputId}` : null;
      default:
        return null;
    }
  };

  const isStageAccessible = (stage: WorkflowStage) => {
    return completedStages.includes(stage) || stage === currentStage;
  };

  return (
    <div className="w-full bg-card border-b">
      <div className="max-w-6xl mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          {Object.entries(DIGITAL_EMPLOYEES).map(([key, employee], index) => {
            const stage = key as WorkflowStage;
            const stageIndex = STAGE_ORDER.indexOf(stage);
            const isCompleted = completedStages.includes(stage);
            const isCurrent = currentStage === stage;
            const isAccessible = isStageAccessible(stage);
            const link = getStageLink(stage);

            const content = (
              <div
                className={cn(
                  "flex items-center gap-2 px-3 py-2 rounded-lg transition-all",
                  isCurrent && "bg-primary/10 ring-2 ring-primary",
                  isCompleted && !isCurrent && "bg-muted",
                  !isAccessible && "opacity-50"
                )}
              >
                <div
                  className={cn(
                    "w-10 h-10 rounded-full flex items-center justify-center text-lg",
                    isCurrent && employee.color + " text-white",
                    isCompleted && !isCurrent && "bg-green-500 text-white",
                    !isAccessible && "bg-muted-foreground/20"
                  )}
                >
                  {isCompleted && !isCurrent ? "✓" : employee.icon}
                </div>
                <div className="hidden md:block">
                  <div className="font-medium text-sm">{employee.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {employee.description}
                  </div>
                </div>
              </div>
            );

            return (
              <div key={stage} className="flex items-center">
                {isAccessible && link ? (
                  <Link href={link} className="hover:opacity-80">
                    {content}
                  </Link>
                ) : (
                  content
                )}
                {index < Object.keys(DIGITAL_EMPLOYEES).length - 1 && (
                  <div
                    className={cn(
                      "w-8 md:w-16 h-0.5 mx-2",
                      stageIndex < currentIndex
                        ? "bg-green-500"
                        : "bg-muted-foreground/20"
                    )}
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
