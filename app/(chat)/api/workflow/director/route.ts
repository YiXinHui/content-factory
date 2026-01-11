import { auth } from "@/app/(auth)/auth";
import {
  getAnalysisById,
  getTopicById,
  getProjectById,
  createOutput,
  updateProjectStage,
} from "@/lib/db/queries";
import { DIRECTOR_PROMPT } from "@/lib/ai/workflow-prompts";
import { NextResponse } from "next/server";
import { z } from "zod";
import OpenAI from "openai";

const directorRequestSchema = z.object({
  analysisId: z.string().uuid(),
});

const directorResponseSchema = z.object({
  contentType: z.string(),
  structure: z.object({
    name: z.string(),
    description: z.string(),
    parts: z.array(z.string()),
  }),
  clipPoints: z.array(
    z.object({
      part: z.string(),
      purpose: z.string(),
      originalText: z.string(),
      duration: z.string(),
    })
  ),
  rerecordSuggestions: z.array(
    z.object({
      position: z.string(),
      type: z.string(),
      content: z.string(),
    })
  ),
  preview: z.string(),
});

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { analysisId } = directorRequestSchema.parse(body);

    const analysis = await getAnalysisById({ id: analysisId });
    if (!analysis) {
      return NextResponse.json({ error: "Analysis not found" }, { status: 404 });
    }

    const topic = await getTopicById({ id: analysis.topicId });
    if (!topic) {
      return NextResponse.json({ error: "Topic not found" }, { status: 404 });
    }

    const project = await getProjectById({ id: topic.projectId });
    if (!project || project.userId !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // 调用 AI 生成剪辑方案
    const client = new OpenAI();

    const userPrompt = `请基于以下深度分析结果，设计短视频切片剪辑方案：

主题：${topic.title}
核心论点：${analysis.coreArgument}

认知对比：
- 大众认知：${analysis.cognitiveContrast.commonBelief}
- 我们的观点：${analysis.cognitiveContrast.ourPoint}
- 认知张力：${analysis.cognitiveContrast.tension}

逻辑链条：
- 因为：${analysis.logicChain.because}
- 所以：${analysis.logicChain.so}
- 而且：${analysis.logicChain.moreover}

传播元素：
- 金句：${analysis.spreadElements.quotes.join("；")}
- 案例：${analysis.spreadElements.cases.join("；")}
- 数据：${analysis.spreadElements.data.join("；")}

原文：
${project.originalText}`;

    const completion = await client.chat.completions.create({
      model: "gpt-4.1-mini",
      messages: [
        { role: "system", content: DIRECTOR_PROMPT },
        { role: "user", content: userPrompt },
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
    const validated = directorResponseSchema.parse(parsed);

    // 保存产出物到数据库
    const output = await createOutput({
      analysisId,
      type: "director",
      directorContent: validated,
    });

    // 更新项目阶段
    await updateProjectStage({ id: project.id, stage: "director" });

    return NextResponse.json({
      success: true,
      output,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error("Validation error:", error.errors);
      return NextResponse.json({ error: "Invalid AI response format" }, { status: 500 });
    }
    console.error("Director error:", error);
    return NextResponse.json({ error: "Failed to generate director plan" }, { status: 500 });
  }
}
