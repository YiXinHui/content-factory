import { auth } from "@/app/(auth)/auth";
import {
  getProjectById,
  getOutputById,
  getAnalysisById,
  getTopicById,
  getNewTopicsByOutputId,
} from "@/lib/db/queries";
import { redirect, notFound } from "next/navigation";
import { PlanningClient } from "./client";

export default async function PlanningPage({
  params,
}: {
  params: Promise<{ projectId: string; outputId: string }>;
}) {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  const { projectId, outputId } = await params;

  const project = await getProjectById({ id: projectId });
  if (!project || project.userId !== session.user.id) {
    notFound();
  }

  const output = await getOutputById({ id: outputId });
  if (!output) {
    notFound();
  }

  const analysis = await getAnalysisById({ id: output.analysisId });
  if (!analysis) {
    notFound();
  }

  const topic = await getTopicById({ id: analysis.topicId });
  if (!topic || topic.projectId !== projectId) {
    notFound();
  }

  // 获取已有的新选题
  const newTopics = await getNewTopicsByOutputId({ outputId });

  return (
    <PlanningClient
      project={project}
      topic={topic}
      analysis={analysis}
      output={output}
      initialNewTopics={newTopics}
    />
  );
}
