import { NextResponse } from "next/server";
import {
  getProjects,
  getWorkItems,
  saveProjects,
  saveWorkItems,
  slugify,
  workItemFromProject,
} from "@/lib/content";
import { requireAdmin } from "@/lib/admin/auth";
import type { Project } from "@/lib/projects";

type ProjectPayload = Partial<Project> & {
  name?: string;
  image?: string;
  industry?: string;
  year?: string;
  aspect?: string;
  comingSoon?: boolean;
};

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await requireAdmin();
    const [work, details] = await Promise.all([
      getWorkItems(),
      getProjects(),
    ]);
    return NextResponse.json({ work, details });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}

export async function POST(request: Request) {
  try {
    await requireAdmin();
    const body = (await request.json()) as ProjectPayload;

    const title = (body.title || body.name || "").trim();
    const cover = (body.cover || body.image || "").trim();
    const summary = (body.summary || "").trim();

    if (!title || !cover || !summary) {
      return NextResponse.json(
        { error: "Title, summary, and cover are required" },
        { status: 400 },
      );
    }

    const slug = slugify(body.slug || title);
    if (!slug) {
      return NextResponse.json({ error: "Invalid slug" }, { status: 400 });
    }

    const [work, projects] = await Promise.all([
      getWorkItems(),
      getProjects(),
    ]);

    if (
      work.some((item) => item.id === slug) ||
      projects.some((project) => project.slug === slug)
    ) {
      return NextResponse.json(
        { error: "A project with this slug already exists" },
        { status: 409 },
      );
    }

    const detail: Project = {
      slug,
      title,
      summary,
      meta:
        Array.isArray(body.meta) && body.meta.length > 0
          ? body.meta
          : [
              { label: "Industry", value: body.industry?.trim() || "Project" },
              { label: "Region", value: "" },
              {
                label: "Year",
                value:
                  body.year?.trim() || new Date().getFullYear().toString(),
              },
              { label: "Role", value: "UX/UI Designer" },
            ],
      siteUrl: body.siteUrl?.trim() || undefined,
      cover,
      coverAlt: body.coverAlt?.trim() || `${title} cover`,
      intro: body.intro?.trim() || undefined,
      problem: body.problem,
      contribution: body.contribution,
      howItWorks: body.howItWorks,
      outcome: body.outcome,
      widgets: Array.isArray(body.widgets) ? body.widgets : [],
      blocks: Array.isArray(body.blocks) ? body.blocks : [],
    };

    projects.push(detail);
    await saveProjects(projects);

    const card = workItemFromProject(detail, {
      aspect: body.aspect?.trim() || "346 / 260",
      comingSoon: Boolean(body.comingSoon),
      meta: body.industry?.trim(),
      year: body.year?.trim(),
    });
    work.unshift(card);
    await saveWorkItems(work);

    return NextResponse.json({ work: card, detail }, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("[admin/projects POST]", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to create project",
      },
      { status: 500 },
    );
  }
}
