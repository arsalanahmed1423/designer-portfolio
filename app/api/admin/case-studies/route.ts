import { NextResponse } from "next/server";
import {
  getCaseStudies,
  getWorkItems,
  saveCaseStudies,
  saveWorkItems,
  slugify,
  workItemFromCaseStudy,
} from "@/lib/content";
import { requireAdmin } from "@/lib/admin/auth";
import type { CaseStudy } from "@/lib/caseStudies";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await requireAdmin();
    return NextResponse.json(await getCaseStudies());
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}

export async function POST(request: Request) {
  try {
    await requireAdmin();
    const body = (await request.json()) as Partial<CaseStudy>;

    if (!body.title?.trim() || !body.summary?.trim() || !body.cover?.trim()) {
      return NextResponse.json(
        { error: "Title, summary, and cover are required" },
        { status: 400 },
      );
    }

    const studies = await getCaseStudies();
    const slug = slugify(body.slug || body.title);
    if (!slug) {
      return NextResponse.json({ error: "Invalid slug" }, { status: 400 });
    }
    if (studies.some((study) => study.slug === slug)) {
      return NextResponse.json(
        { error: "A case study with this slug already exists" },
        { status: 409 },
      );
    }

    const study: CaseStudy = {
      slug,
      title: body.title.trim(),
      summary: body.summary.trim(),
      meta: Array.isArray(body.meta) && body.meta.length > 0
        ? body.meta
        : [
            { label: "Industry", value: "General" },
            { label: "Year", value: new Date().getFullYear().toString() },
            { label: "Role", value: "UX/UI Designer" },
          ],
      siteUrl: body.siteUrl?.trim() || undefined,
      cover: body.cover.trim(),
      coverAlt: body.coverAlt?.trim() || `${body.title.trim()} cover`,
      blocks: Array.isArray(body.blocks) ? body.blocks : [],
    };

    studies.push(study);
    await saveCaseStudies(studies);

    const work = await getWorkItems();
    const card = workItemFromCaseStudy(study);
    const existingIndex = work.findIndex((item) => item.id === study.slug);
    if (existingIndex >= 0) {
      work[existingIndex] = card;
    } else {
      work.unshift(card);
    }
    await saveWorkItems(work);

    return NextResponse.json(study, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json(
      { error: "Failed to create case study" },
      { status: 500 },
    );
  }
}
