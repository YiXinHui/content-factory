import { auth } from "@/app/(auth)/auth";
import {
  getOutputById,
  getAnalysisById,
  getTopicById,
  getProjectById,
  createNewTopics,
  updateProjectStage,
} from "@/lib/db/queries";
import { PLANNING_PROMPT } from "@/lib/ai/workflow-prompts";
import { NextResponse } from "next/server";
import { z } from "zod";
import { createCozeClient } from "@/lib/ai/coze-client";

const planningRequestSchema = z.object({
  outputId: z.string().uuid(),
});

const planningResponseSchema = z.object({
  newTopics: z.array(
    z.object({
      title: z.string(),
      direction: z.enum(["up", "down", "parallel"]),
      directionLabel: z.string(),
      description: z.string(),
      potentialAngle: z.string().optional(),
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
    const { outputId } = planningRequestSchema.parse(body);

    const output = await getOutputById({ id: outputId });
    if (!output) {
      return NextResponse.json({ error: "Output not found" }, { status: 404 });
    }

    const analysis = await getAnalysisById({ id: output.analysisId });
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

    // 构建上下文
    let outputSummary = "";
    if (output.type === "director" && output.directorContent) {
      outputSummary = `内容类型：${output.directorContent.contentType}
剪辑结构：${output.directorContent.structure.name}
成品预览：${output.directorContent.preview}`;
    } else if (output.type === "copywriter" && output.copywriterContent) {
      outputSummary = `选定标题：${output.copywriterContent.selectedTitle?.title || "未选定"}
文案结构：${output.copywriterContent.selectedFormula?.name || "未选定"}`;
    }

    // 调用 Coze API 发散新选题
    const cozeClient = createCozeClient();

    const prompt = `${PLANNING_PROMPT}

请围绕以下已完成的内容，发散新的选题方向：

主题：${topic.title}
核心论点：${analysis.coreArgument}

认知对比：
- 大众认知：${analysis.cognitiveContrast.commonBelief}
- 我们的观点：${analysis.cognitiveContrast.ourPoint}

产出物类型：${output.type === "director" ? "编导方案" : "文案"}
${outputSummary}

请以 JSON 格式返回结果，格式如下：
{
  "newTopics": [
    {
      "title": "选题标题",
      "direction": "up/down/parallel",
      "directionLabel": "向上延伸/向下细分/平行拓展",
      "description": "选题描述",
      "potentialAngle": "潜在切入角度"
    }
  ]
}

注意：
- direction 必须是 "up"、"down" 或 "parallel" 之一
- 向上延伸(up)：更宏观的视角
- 向下细分(down)：更具体的细节
- 平行拓展(parallel)：相关但不同的角度`;

    const response = await cozeClient.chat(prompt, session.user.id || 'anonymous');

    // 尝试从响应中提取 JSON
    let jsonContent = response;
    const jsonMatch = response.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      jsonContent = jsonMatch[1].trim();
    }

    // 解析 AI 响应
    const parsed = JSON.parse(jsonContent);
    const validated = planningResponseSchema.parse(parsed);

    // 保存新选题到数据库
    const createdTopics = await createNewTopics({
      topics: validated.newTopics.map((t) => ({
        outputId,
        title: t.title,
        direction: t.direction,
        directionLabel: t.directionLabel,
        description: t.description,
        potentialAngle: t.potentialAngle,
      })),
    });

    // 更新项目阶段
    await updateProjectStage({ id: project.id, stage: "completed" });

    return NextResponse.json({
      success: true,
      newTopics: createdTopics,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error("Validation error:", error.errors);
      return NextResponse.json({ error: "Invalid AI response format" }, { status: 500 });
    }
    console.error("Planning error:", error);
    return NextResponse.json({ error: "Failed to generate new topics" }, { status: 500 });
  }
}
