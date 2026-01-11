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
import { createCozeClient } from "@/lib/ai/coze-client";

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

    // 调用 Coze API 生成剪辑方案
    const cozeClient = createCozeClient();

    const prompt = `${DIRECTOR_PROMPT}

请基于以下深度分析结果，设计短视频切片剪辑方案：

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
${project.originalText}

请以 JSON 格式返回结果，格式如下：
{
  "contentType": "内容类型（如：知识分享、观点输出等）",
  "structure": {
    "name": "结构名称",
    "description": "结构描述",
    "parts": ["部分1", "部分2", "部分3"]
  },
  "clipPoints": [
    {
      "part": "对应部分",
      "purpose": "剪辑目的",
      "originalText": "原文片段",
      "duration": "建议时长"
    }
  ],
  "rerecordSuggestions": [
    {
      "position": "位置",
      "type": "类型",
      "content": "补录内容"
    }
  ],
  "preview": "整体预览描述"
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
