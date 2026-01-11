import { auth } from "@/app/(auth)/auth";
import { getProjectById } from "@/lib/db/queries";
import { redirect, notFound } from "next/navigation";

export default async function WorkflowPage({
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

  // 根据当前阶段重定向到对应页面
  switch (project.currentStage) {
    case "mining":
      redirect(`/workflow/${projectId}/mining`);
    case "analysis":
    case "director":
    case "copywriter":
    case "planning":
    case "completed":
      // 这些阶段需要额外参数，先重定向到 mining 页面
      redirect(`/workflow/${projectId}/mining`);
    default:
      redirect(`/workflow/${projectId}/mining`);
  }
}
