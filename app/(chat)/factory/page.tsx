import { auth } from "@/app/(auth)/auth";
import { getProjectsByUserId } from "@/lib/db/queries";
import { redirect } from "next/navigation";
import { FactoryClient } from "./client";

export default async function FactoryPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  const projects = await getProjectsByUserId({ userId: session.user.id });

  return <FactoryClient initialProjects={projects} />;
}
