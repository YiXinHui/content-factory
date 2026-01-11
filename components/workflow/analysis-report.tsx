"use client";

import { cn } from "@/lib/utils";
import type { Analysis } from "@/lib/db/schema";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Badge } from "@/components/ui/badge";
import { ChevronDown, Quote, BookOpen, BarChart3, HelpCircle } from "lucide-react";
import { useState } from "react";

interface AnalysisReportProps {
  analysis: Analysis;
  className?: string;
}

interface SectionProps {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  defaultOpen?: boolean;
}

function Section({ title, icon, children, defaultOpen = true }: SectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger className="flex items-center justify-between w-full p-4 bg-muted/50 rounded-lg hover:bg-muted transition-colors">
        <div className="flex items-center gap-2">
          {icon}
          <span className="font-medium">{title}</span>
        </div>
        <ChevronDown
          className={cn(
            "w-4 h-4 transition-transform",
            isOpen && "transform rotate-180"
          )}
        />
      </CollapsibleTrigger>
      <CollapsibleContent className="px-4 py-3">{children}</CollapsibleContent>
    </Collapsible>
  );
}

export function AnalysisReport({ analysis, className }: AnalysisReportProps) {
  const cognitiveContrast = analysis.cognitiveContrast as {
    commonBelief: string;
    ourPoint: string;
    tension: string;
  };

  const logicChain = analysis.logicChain as {
    because: string;
    so: string;
    moreover: string;
  };

  const spreadElements = analysis.spreadElements as {
    quotes: string[];
    cases: string[];
    data: string[];
  };

  const audienceQuestions = analysis.audienceQuestions as {
    question: string;
    answerDirection: string;
  }[];

  return (
    <div className={cn("space-y-4", className)}>
      {/* 核心观点 */}
      <Section
        title="核心观点提炼"
        icon={<span className="text-lg">💡</span>}
      >
        <blockquote className="border-l-4 border-primary pl-4 py-2 text-lg font-medium italic">
          {analysis.coreArgument}
        </blockquote>
      </Section>

      {/* 认知对比 */}
      <Section
        title="认知对比"
        icon={<span className="text-lg">⚡</span>}
      >
        <div className="grid md:grid-cols-2 gap-4">
          <div className="p-4 bg-muted/30 rounded-lg">
            <div className="text-sm text-muted-foreground mb-2">大众普遍认知</div>
            <p className="text-foreground">{cognitiveContrast.commonBelief}</p>
          </div>
          <div className="p-4 bg-primary/10 rounded-lg border border-primary/20">
            <div className="text-sm text-primary mb-2">我们的观点</div>
            <p className="text-foreground font-medium">{cognitiveContrast.ourPoint}</p>
          </div>
        </div>
        <div className="mt-4 p-4 bg-orange-50 dark:bg-orange-950/30 rounded-lg border border-orange-200 dark:border-orange-900">
          <div className="text-sm text-orange-600 dark:text-orange-400 mb-1">
            认知势能/张力
          </div>
          <p className="text-foreground">{cognitiveContrast.tension}</p>
        </div>
      </Section>

      {/* 逻辑链条 */}
      <Section
        title="逻辑链条"
        icon={<span className="text-lg">🔗</span>}
      >
        <div className="space-y-3">
          <div className="flex items-start gap-3">
            <Badge variant="outline" className="shrink-0 mt-0.5">
              因为
            </Badge>
            <p>{logicChain.because}</p>
          </div>
          <div className="flex items-start gap-3">
            <Badge variant="outline" className="shrink-0 mt-0.5">
              所以
            </Badge>
            <p>{logicChain.so}</p>
          </div>
          <div className="flex items-start gap-3">
            <Badge variant="outline" className="shrink-0 mt-0.5">
              而且
            </Badge>
            <p>{logicChain.moreover}</p>
          </div>
        </div>
      </Section>

      {/* 传播元素 */}
      <Section
        title="传播元素"
        icon={<span className="text-lg">📢</span>}
      >
        <div className="space-y-4">
          {spreadElements.quotes.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Quote className="w-4 h-4 text-purple-500" />
                <span className="font-medium text-sm">金句</span>
              </div>
              <div className="space-y-2">
                {spreadElements.quotes.map((quote, index) => (
                  <blockquote
                    key={index}
                    className="border-l-2 border-purple-500 pl-3 py-1 text-sm italic"
                  >
                    "{quote}"
                  </blockquote>
                ))}
              </div>
            </div>
          )}

          {spreadElements.cases.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <BookOpen className="w-4 h-4 text-blue-500" />
                <span className="font-medium text-sm">案例</span>
              </div>
              <ul className="space-y-1">
                {spreadElements.cases.map((caseItem, index) => (
                  <li key={index} className="text-sm flex items-start gap-2">
                    <span className="text-blue-500">•</span>
                    {caseItem}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {spreadElements.data.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <BarChart3 className="w-4 h-4 text-green-500" />
                <span className="font-medium text-sm">数据</span>
              </div>
              <ul className="space-y-1">
                {spreadElements.data.map((dataItem, index) => (
                  <li key={index} className="text-sm flex items-start gap-2">
                    <span className="text-green-500">•</span>
                    {dataItem}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </Section>

      {/* 受众问题 */}
      <Section
        title="受众问题预判"
        icon={<HelpCircle className="w-5 h-5 text-amber-500" />}
      >
        <div className="space-y-4">
          {audienceQuestions.map((qa, index) => (
            <div key={index} className="p-4 bg-muted/30 rounded-lg">
              <div className="font-medium text-sm mb-2 flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-amber-500 text-white text-xs flex items-center justify-center">
                  {index + 1}
                </span>
                {qa.question}
              </div>
              <p className="text-sm text-muted-foreground pl-8">
                💬 {qa.answerDirection}
              </p>
            </div>
          ))}
        </div>
      </Section>
    </div>
  );
}
