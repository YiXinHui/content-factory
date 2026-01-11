import { auth } from "@/app/(auth)/auth";
import { getProjectById, createTopics, updateProjectStage } from "@/lib/db/queries";
import { MINING_PROMPT } from "@/lib/ai/workflow-prompts";
import { NextResponse } from "next/server";
import { z } from "zod";
import OpenAI from "openai";

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

    // 调用 AI 进行内容挖掘
    const client = new OpenAI();
    
    const completion = await client.chat.completions.create({
      model: "gpt-4.1-mini",
      messages: [
        { role: "system", content: MINING_PROMPT },
        { role: "user", content: `请分析以下文本，挖掘高价值主题：\n\n${project.originalText}` },
      ],
      temperature: 0.7,
      response_format: { type: "json_object" },
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) {
      throw new Error("No response from AI");
    }

    // 解析 AI 响应
    const parsed = JSON.parse(content);
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
