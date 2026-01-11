import { auth } from "@/app/(auth)/auth";
import {
  getAnalysisById,
  getTopicById,
  getProjectById,
  createOutput,
  updateOutput,
  getOutputByAnalysisId,
  updateProjectStage,
} from "@/lib/db/queries";
import {
  COPYWRITER_FORMULA_PROMPT,
  COPYWRITER_STRUCTURE_PROMPT,
  COPYWRITER_TITLE_PROMPT,
  COPYWRITER_CONTENT_PROMPT,
} from "@/lib/ai/workflow-prompts";
import { NextResponse } from "next/server";
import { z } from "zod";
import OpenAI from "openai";

const copywriterRequestSchema = z.object({
  analysisId: z.string().uuid(),
  step: z.number().min(1).max(4),
  selectedFormula: z
    .object({
      name: z.string(),
      description: z.string(),
      whyFit: z.string(),
      example: z.string(),
    })
    .optional(),
  selectedTitle: z
    .object({
      title: z.string(),
      elements: z.array(z.string()),
      hook: z.string(),
    })
    .optional(),
});

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { analysisId, step, selectedFormula, selectedTitle } =
      copywriterRequestSchema.parse(body);

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

    const client = new OpenAI();

    // 获取或创建 output
    let output = await getOutputByAnalysisId({ analysisId, type: "copywriter" });

    const baseContext = `主题：${topic.title}
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
- 数据：${analysis.spreadElements.data.join("；")}`;

    let result: any;

    switch (step) {
      case 1: {
        // Step 1: 推荐公式
        const completion = await client.chat.completions.create({
          model: "gpt-4.1-mini",
          messages: [
            { role: "system", content: COPYWRITER_FORMULA_PROMPT },
            {
              role: "user",
              content: `请为以下主题推荐3种最适合的文案结构公式：\n\n${baseContext}`,
            },
          ],
          temperature: 0.7,
          response_format: { type: "json_object" },
        });

        const content = completion.choices[0]?.message?.content;
        if (!content) throw new Error("No response from AI");

        const parsed = JSON.parse(content);
        result = parsed;

        // 创建或更新 output
        if (!output) {
          output = await createOutput({
            analysisId,
            type: "copywriter",
            copywriterContent: {
              formulas: parsed.formulas,
              currentStep: 1,
            },
          });
        } else {
          await updateOutput({
            id: output.id,
            copywriterContent: {
              ...output.copywriterContent,
              formulas: parsed.formulas,
              currentStep: 1,
            },
          });
        }
        break;
      }

      case 2: {
        // Step 2: 生成结构
        if (!selectedFormula) {
          return NextResponse.json(
            { error: "Selected formula is required for step 2" },
            { status: 400 }
          );
        }

        const completion = await client.chat.completions.create({
          model: "gpt-4.1-mini",
          messages: [
            { role: "system", content: COPYWRITER_STRUCTURE_PROMPT },
            {
              role: "user",
              content: `用户选择了"${selectedFormula.name}"公式，请生成文章骨架：

公式说明：${selectedFormula.description}
结构示例：${selectedFormula.example}

${baseContext}`,
            },
          ],
          temperature: 0.7,
          response_format: { type: "json_object" },
        });

        const content = completion.choices[0]?.message?.content;
        if (!content) throw new Error("No response from AI");

        const parsed = JSON.parse(content);
        result = parsed;

        if (output) {
          await updateOutput({
            id: output.id,
            copywriterContent: {
              ...output.copywriterContent,
              selectedFormula,
              structure: parsed.structure,
              totalEstimatedWords: parsed.totalEstimatedWords,
              currentStep: 2,
            },
          });
        }
        break;
      }

      case 3: {
        // Step 3: 生成标题
        const completion = await client.chat.completions.create({
          model: "gpt-4.1-mini",
          messages: [
            { role: "system", content: COPYWRITER_TITLE_PROMPT },
            {
              role: "user",
              content: `请为以下内容生成8-10个吸睛标题：\n\n${baseContext}`,
            },
          ],
          temperature: 0.8,
          response_format: { type: "json_object" },
        });

        const content = completion.choices[0]?.message?.content;
        if (!content) throw new Error("No response from AI");

        const parsed = JSON.parse(content);
        result = parsed;

        if (output) {
          await updateOutput({
            id: output.id,
            copywriterContent: {
              ...output.copywriterContent,
              titles: parsed.titles,
              currentStep: 3,
            },
          });
        }
        break;
      }

      case 4: {
        // Step 4: 生成全文
        if (!selectedTitle || !output?.copywriterContent) {
          return NextResponse.json(
            { error: "Selected title and previous steps are required" },
            { status: 400 }
          );
        }

        const structureText = output.copywriterContent.structure
          ?.map(
            (s: any) =>
              `${s.section}（${s.subtitle}）：${s.keyPoints.join("、")}，约${s.estimatedWords}字`
          )
          .join("\n");

        const completion = await client.chat.completions.create({
          model: "gpt-4.1-mini",
          messages: [
            { role: "system", content: COPYWRITER_CONTENT_PROMPT },
            {
              role: "user",
              content: `请根据以下信息生成完整文案：

选定标题：${selectedTitle.title}

文章结构：
${structureText}

${baseContext}

原文参考：
${project.originalText}`,
            },
          ],
          temperature: 0.7,
        });

        const content = completion.choices[0]?.message?.content;
        if (!content) throw new Error("No response from AI");

        result = { fullContent: content };

        await updateOutput({
          id: output.id,
          copywriterContent: {
            ...output.copywriterContent,
            selectedTitle,
            fullContent: content,
            currentStep: 4,
          },
        });

        // 更新项目阶段
        await updateProjectStage({ id: project.id, stage: "copywriter" });
        break;
      }
    }

    // 重新获取更新后的 output
    output = await getOutputByAnalysisId({ analysisId, type: "copywriter" });

    return NextResponse.json({
      success: true,
      step,
      result,
      output,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error("Validation error:", error.errors);
      return NextResponse.json({ error: "Invalid request format" }, { status: 400 });
    }
    console.error("Copywriter error:", error);
    return NextResponse.json({ error: "Failed to generate content" }, { status: 500 });
  }
}
