import { auth } from "@/app/(auth)/auth";
import { createProject, getProjectsByUserId } from "@/lib/db/queries";
import { NextResponse } from "next/server";
import { z } from "zod";

const createProjectSchema = z.object({
  title: z.string().min(1).max(255),
  originalText: z.string().min(10),
});

// 创建新项目
export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { title, originalText } = createProjectSchema.parse(body);

    const project = await createProject({
      userId: session.user.id,
      title,
      originalText,
    });

    return NextResponse.json(project);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }
    console.error("Failed to create project:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// 获取用户的项目列表
export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") || "20");

    const projects = await getProjectsByUserId({
      userId: session.user.id,
      limit,
    });

    return NextResponse.json(projects);
  } catch (error) {
    console.error("Failed to get projects:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
