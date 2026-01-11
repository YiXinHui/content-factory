import { auth } from "@/app/(auth)/auth";
import { getProjectById, createTopics, updateProjectStage } from "@/lib/db/queries";
import { MINING_PROMPT } from "@/lib/ai/workflow-prompts";
import { NextResponse } from "next/server";
import { z } from "zod";
import { createCozeClient } from "@/lib/ai/coze-client";

const miningRequestSchema = z.object({
  projectId: z.string().uuid(),
});

const topicSchema = z.object({
  title: z.string(),
  coreIdea: z.string(),
  emotionLevel: z.number().min(1).max(5),
  supportMaterials: z.object({
    cases: z.number(),
    quotes: z.number(),
    data: z.number(),
  }),
  highlightedText: z.array(z.string()),
  reason: z.string().optional(),
});

const miningResponseSchema = z.object({
  topics: z.array(topicSchema),
});

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { projectId } = miningRequestSchema.parse(body);

    const project = await getProjectById({ id: projectId });
    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    if (project.userId !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // 调用 Coze API 进行内容挖掘
    const cozeClient = createCozeClient();
    
    const prompt = `${MINING_PROMPT}

请分析以下文本，挖掘高价值主题：

${project.originalText}

请以 JSON 格式返回结果，格式如下：
{
  "topics": [
    {
      "title": "主题标题",
      "coreIdea": "核心观点",
      "emotionLevel": 1-5的数字,
      "supportMaterials": {
        "cases": 案例数量,
        "quotes": 金句数量,
        "data": 数据数量
      },
      "highlightedText": ["原文中的关键句子1", "关键句子2"],
      "reason": "推荐理由"
    }
  ]
}`;

    const response = await cozeClient.chat(prompt, session.user.id || 'anonymous');

    // 尝试从响应中提取 JSON
    let jsonContent = response;
    
    // 如果响应包含 markdown 代码块，提取其中的 JSON
    const jsonMatch = response.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      jsonContent = jsonMatch[1].trim();
    }

    // 解析 AI 响应
    const parsed = JSON.parse(jsonContent);
    const validated = miningResponseSchema.parse(parsed);

    // 保存主题到数据库
    const createdTopics = await createTopics({
      topics: validated.topics.map((t) => ({
        projectId,
        title: t.title,
        coreIdea: t.coreIdea,
        emotionLevel: t.emotionLevel,
        supportMaterials: t.supportMaterials,
        highlightedText: t.highlightedText,
        reason: t.reason,
      })),
    });

    return NextResponse.json({
      success: true,
      topics: createdTopics,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error("Validation error:", error.errors);
      return NextResponse.json({ error: "Invalid AI response format" }, { status: 500 });
    }
    console.error("Mining error:", error);
    return NextResponse.json({ error: "Failed to process content" }, { status: 500 });
  }
}
