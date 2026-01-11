import { auth } from "@/app/(auth)/auth";
import {
  getTopicById,
  getProjectById,
  createAnalysis,
  selectTopic,
  updateProjectStage,
} from "@/lib/db/queries";
import { ANALYSIS_PROMPT } from "@/lib/ai/workflow-prompts";
import { NextResponse } from "next/server";
import { z } from "zod";
import { createCozeClient } from "@/lib/ai/coze-client";

const analysisRequestSchema = z.object({
  topicId: z.string().uuid(),
});

const analysisResponseSchema = z.object({
  coreArgument: z.string(),
  cognitiveContrast: z.object({
    commonBelief: z.string(),
    ourPoint: z.string(),
    tension: z.string(),
  }),
  logicChain: z.object({
    because: z.string(),
    so: z.string(),
    moreover: z.string(),
  }),
  spreadElements: z.object({
    quotes: z.array(z.string()),
    cases: z.array(z.string()),
    data: z.array(z.string()),
  }),
  audienceQuestions: z.array(
    z.object({
      question: z.string(),
      answerDirection: z.string(),
    })
  ),
});

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { topicId } = analysisRequestSchema.parse(body);

    const topic = await getTopicById({ id: topicId });
    if (!topic) {
      return NextResponse.json({ error: "Topic not found" }, { status: 404 });
    }

    const project = await getProjectById({ id: topic.projectId });
    if (!project || project.userId !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // 标记主题为已选中
    await selectTopic({ id: topicId });

    // 调用 Coze API 进行深度分析
    const cozeClient = createCozeClient();

    const prompt = `${ANALYSIS_PROMPT}

请对以下主题进行五步深度分析：

主题标题：${topic.title}
核心观点：${topic.coreIdea}

原文相关段落：
${topic.highlightedText.join("\n\n")}

完整原文参考：
${project.originalText}

请以 JSON 格式返回结果，格式如下：
{
  "coreArgument": "核心论点",
  "cognitiveContrast": {
    "commonBelief": "大众普遍认为...",
    "ourPoint": "但我们的观点是...",
    "tension": "这种认知张力在于..."
  },
  "logicChain": {
    "because": "因为...",
    "so": "所以...",
    "moreover": "进一步说明..."
  },
  "spreadElements": {
    "quotes": ["金句1", "金句2"],
    "cases": ["案例1", "案例2"],
    "data": ["数据1", "数据2"]
  },
  "audienceQuestions": [
    {
      "question": "受众可能的问题",
      "answerDirection": "回答方向"
    }
  ]
}`;

    const response = await cozeClient.chat(prompt, session.user.id || 'anonymous');

    // 尝试从响应中提取 JSON
    let jsonContent = response;
    const jsonMatch = response.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      jsonContent = jsonMatch[1].trim();
    }

    // 解析 AI 响应
    const parsed = JSON.parse(jsonContent);
    const validated = analysisResponseSchema.parse(parsed);

    // 保存分析结果到数据库
    const analysis = await createAnalysis({
      topicId,
      coreArgument: validated.coreArgument,
      cognitiveContrast: validated.cognitiveContrast,
      logicChain: validated.logicChain,
      spreadElements: validated.spreadElements,
      audienceQuestions: validated.audienceQuestions,
    });

    // 更新项目阶段
    await updateProjectStage({ id: project.id, stage: "analysis" });

    return NextResponse.json({
      success: true,
      analysis,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error("Validation error:", error.errors);
      return NextResponse.json({ error: "Invalid AI response format" }, { status: 500 });
    }
    console.error("Analysis error:", error);
    return NextResponse.json({ error: "Failed to analyze content" }, { status: 500 });
  }
}
