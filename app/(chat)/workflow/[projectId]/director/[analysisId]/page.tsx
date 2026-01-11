import { auth } from "@/app/(auth)/auth";
import {
  getProjectById,
  getAnalysisById,
  getTopicById,
  getOutputByAnalysisId,
} from "@/lib/db/queries";
import { redirect, notFound } from "next/navigation";
import { DirectorClient } from "./client";

export default async function DirectorPage({
  params,
}: {
  params: Promise<{ projectId: string; analysisId: string }>;
}) {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  const { projectId, analysisId } = await params;

  const project = await getProjectById({ id: projectId });
  if (!project || project.userId !== session.user.id) {
    notFound();
  }

  const analysis = await getAnalysisById({ id: analysisId });
  if (!analysis) {
    notFound();
  }

  const topic = await getTopicById({ id: analysis.topicId });
  if (!topic || topic.projectId !== projectId) {
    notFound();
  }

  // 获取已有的编导产出
  const output = await getOutputByAnalysisId({ analysisId, type: "director" });

  return (
    <DirectorClient
      project={project}
      topic={topic}
      analysis={analysis}
      initialOutput={output}
    />
  );
}
