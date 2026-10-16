import { NextResponse } from "next/server";
import {
  getCaseStudies,
  getWorkItems,
  saveCaseStudies,
  saveWorkItems,
  workItemFromCaseStudy,
} from "@/lib/content";
import { requireAdmin } from "@/lib/admin/auth";
import type { CaseStudy } from "@/lib/caseStudies";

type Params = { params: Promise<{ slug: string }> };

export const dynamic = "force-dynamic";

export async function GET(_request: Request, { params }: Params) {
  try {
    await requireAdmin();
    const { slug } = await params;
    const studies = await getCaseStudies();
    const study = studies.find((entry) => entry.slug === slug);
    if (!study) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json(study);
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}

export async function PUT(request: Request, { params }: Params) {
  try {
    await requireAdmin();
    const { slug } = await params;
    const body = (await request.json()) as Partial<CaseStudy>;
    const studies = await getCaseStudies();
    const index = studies.findIndex((entry) => entry.slug === slug);
    if (index < 0) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const current = studies[index]!;
    const updated: CaseStudy = {
      ...current,
      title: body.title?.trim() || current.title,
      summary: body.summary?.trim() || current.summary,
      meta: Array.isArray(body.meta) ? body.meta : current.meta,
      siteUrl:
        body.siteUrl === undefined
          ? current.siteUrl
          : body.siteUrl.trim() || undefined,
      cover: body.cover?.trim() || current.cover,
      coverAlt: body.coverAlt?.trim() || current.coverAlt,
      blocks: Array.isArray(body.blocks) ? body.blocks : current.blocks,
      slug: current.slug,
    };

    studies[index] = updated;
    await saveCaseStudies(studies);

    const work = await getWorkItems();
    const card = workItemFromCaseStudy(updated);
    const workIndex = work.findIndex((item) => item.id === updated.slug);
    if (workIndex >= 0) {
      work[workIndex] = { ...work[workIndex], ...card };
    } else {
      work.unshift(card);
    }
    await saveWorkItems(work);

    return NextResponse.json(updated);
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json(
      { error: "Failed to update case study" },
      { status: 500 },
    );
  }
}

export async function DELETE(_request: Request, { params }: Params) {
  try {
    await requireAdmin();
    const { slug } = await params;
    const studies = await getCaseStudies();
    const nextStudies = studies.filter((entry) => entry.slug !== slug);
    if (nextStudies.length === studies.length) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    await saveCaseStudies(nextStudies);

    const work = await getWorkItems();
    await saveWorkItems(work.filter((item) => item.id !== slug));

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
