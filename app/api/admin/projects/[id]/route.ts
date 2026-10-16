import { NextResponse } from "next/server";
import {
  getProjects,
  getWorkItems,
  saveProjects,
  saveWorkItems,
  workItemFromProject,
} from "@/lib/content";
import { requireAdmin } from "@/lib/admin/auth";
import type { Project } from "@/lib/projects";

type Params = { params: Promise<{ id: string }> };

type ProjectPayload = Partial<Project> & {
  name?: string;
  image?: string;
  industry?: string;
  year?: string;
  aspect?: string;
  comingSoon?: boolean;
};

export const dynamic = "force-dynamic";

export async function GET(_request: Request, { params }: Params) {
  try {
    await requireAdmin();
    const { id } = await params;
    const [work, projects] = await Promise.all([
      getWorkItems(),
      getProjects(),
    ]);
    const item = work.find((entry) => entry.id === id) ?? null;
    const detail = projects.find((entry) => entry.slug === id) ?? null;
    if (!item && !detail) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json({ work: item, detail });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}

export async function PUT(request: Request, { params }: Params) {
  try {
    await requireAdmin();
    const { id } = await params;
    const body = (await request.json()) as ProjectPayload;
    const [work, projects] = await Promise.all([
      getWorkItems(),
      getProjects(),
    ]);

    const workIndex = work.findIndex((entry) => entry.id === id);
    const detailIndex = projects.findIndex((entry) => entry.slug === id);

    if (workIndex < 0 && detailIndex < 0) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const currentDetail = detailIndex >= 0 ? projects[detailIndex]! : null;
    const title =
      body.title?.trim() ||
      body.name?.trim() ||
      currentDetail?.title ||
      work[workIndex]?.name ||
      id;
    const cover =
      body.cover?.trim() ||
      body.image?.trim() ||
      currentDetail?.cover ||
      work[workIndex]?.image ||
      "";
    const summary =
      body.summary?.trim() || currentDetail?.summary || "";

    if (!title || !cover || !summary) {
      return NextResponse.json(
        { error: "Title, summary, and cover are required" },
        { status: 400 },
      );
    }

    const updatedDetail: Project = {
      slug: id,
      title,
      summary,
      meta: Array.isArray(body.meta)
        ? body.meta
        : currentDetail?.meta ?? [
            { label: "Industry", value: body.industry?.trim() || "Project" },
            { label: "Region", value: "" },
            {
              label: "Year",
              value:
                body.year?.trim() ||
                work[workIndex]?.year ||
                new Date().getFullYear().toString(),
            },
            { label: "Role", value: "UX/UI Designer" },
          ],
      siteUrl:
        body.siteUrl === undefined
          ? currentDetail?.siteUrl
          : body.siteUrl.trim() || undefined,
      cover,
      coverAlt:
        body.coverAlt?.trim() ||
        currentDetail?.coverAlt ||
        `${title} cover`,
      intro:
        body.intro === undefined
          ? currentDetail?.intro
          : body.intro.trim() || undefined,
      problem:
        body.problem === undefined ? currentDetail?.problem : body.problem,
      contribution:
        body.contribution === undefined
          ? currentDetail?.contribution
          : body.contribution,
      howItWorks:
        body.howItWorks === undefined
          ? currentDetail?.howItWorks
          : body.howItWorks,
      outcome:
        body.outcome === undefined ? currentDetail?.outcome : body.outcome,
      widgets: Array.isArray(body.widgets)
        ? body.widgets
        : currentDetail?.widgets ?? [],
      blocks: Array.isArray(body.blocks)
        ? body.blocks
        : currentDetail?.blocks ?? [],
    };

    if (detailIndex >= 0) {
      projects[detailIndex] = updatedDetail;
    } else {
      projects.push(updatedDetail);
    }
    await saveProjects(projects);

    const card = workItemFromProject(updatedDetail, {
      aspect:
        body.aspect?.trim() ||
        work[workIndex]?.aspect ||
        "346 / 260",
      comingSoon:
        body.comingSoon === undefined
          ? work[workIndex]?.comingSoon
          : Boolean(body.comingSoon),
      meta: body.industry?.trim(),
      year: body.year?.trim(),
    });

    if (workIndex >= 0) {
      work[workIndex] = { ...work[workIndex], ...card, id };
    } else {
      work.unshift(card);
    }
    await saveWorkItems(work);

    return NextResponse.json({ work: card, detail: updatedDetail });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("[admin/projects PUT]", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to update project",
      },
      { status: 500 },
    );
  }
}

export async function DELETE(_request: Request, { params }: Params) {
  try {
    await requireAdmin();
    const { id } = await params;
    const [work, projects] = await Promise.all([
      getWorkItems(),
      getProjects(),
    ]);

    const nextWork = work.filter((entry) => entry.id !== id);
    const nextProjects = projects.filter((entry) => entry.slug !== id);

    if (
      nextWork.length === work.length &&
      nextProjects.length === projects.length
    ) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    await Promise.all([
      saveWorkItems(nextWork),
      saveProjects(nextProjects),
    ]);
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("[admin/projects DELETE]", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to delete project",
      },
      { status: 500 },
    );
  }
}
