import { auth } from "@/app/(auth)/auth";
import {
  getProjectById,
  getTopicById,
  getAnalysisByTopicId,
} from "@/lib/db/queries";
import { redirect, notFound } from "next/navigation";
import { AnalysisClient } from "./client";

export default async function AnalysisPage({
  params,
}: {
  params: Promise<{ projectId: string; topicId: string }>;
}) {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  const { projectId, topicId } = await params;

  const project = await getProjectById({ id: projectId });
  if (!project || project.userId !== session.user.id) {
    notFound();
  }

  const topic = await getTopicById({ id: topicId });
  if (!topic || topic.projectId !== projectId) {
    notFound();
  }

  // 获取已有的分析结果
  const analysis = await getAnalysisByTopicId({ topicId });

  return (
    <AnalysisClient
      project={project}
      topic={topic}
      initialAnalysis={analysis}
    />
  );
}
