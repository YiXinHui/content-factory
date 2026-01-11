import { auth } from "@/app/(auth)/auth";
import { getProjectById, getTopicsByProjectId } from "@/lib/db/queries";
import { redirect, notFound } from "next/navigation";
import { MiningClient } from "./client";

export default async function MiningPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  const { projectId } = await params;
  const project = await getProjectById({ id: projectId });

  if (!project) {
    notFound();
  }

  if (project.userId !== session.user.id) {
    notFound();
  }

  // 获取已有的主题
  const topics = await getTopicsByProjectId({ projectId });

  return (
    <MiningClient
      project={project}
      initialTopics={topics}
    />
  );
}
