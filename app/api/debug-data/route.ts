import { NextResponse } from "next/server";
import { getProjects, getWorkItems } from "@/lib/content";
import { isBlobStorageConfigured } from "@/lib/dataStore";

export const dynamic = "force-dynamic";

export async function GET() {
  const blobConfigured = isBlobStorageConfigured();
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  const storeId = process.env.BLOB_STORE_ID;

  let workCount = 0;
  let workSample: string[] = [];
  let projectsCount = 0;
  let projectsSample: string[] = [];
  let error: string | null = null;

  try {
    const [work, projects] = await Promise.all([
      getWorkItems(),
      getProjects(),
    ]);
    workCount = work.length;
    workSample = work.slice(0, 5).map((w) => w.name);
    projectsCount = projects.length;
    projectsSample = projects.slice(0, 5).map((p) => p.title);
  } catch (err) {
    error = err instanceof Error ? err.message : String(err);
  }

  return NextResponse.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    environment: {
      isVercel: Boolean(process.env.VERCEL),
      blobConfigured,
      hasBlobToken: Boolean(token),
      tokenPrefix: token ? `${token.slice(0, 18)}...` : null,
      storeId: storeId ?? null,
    },
    data: {
      workCount,
      workSample,
      projectsCount,
      projectsSample,
    },
    error,
  });
}
