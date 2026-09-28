import { randomUUID } from "crypto";
import { promises as fs } from "fs";
import path from "path";
import { put } from "@vercel/blob";
import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin/auth";

const ALLOWED = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/svg+xml",
]);

export async function POST(request: Request) {
  try {
    await requireAdmin();
    const form = await request.formData();
    const file = form.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }
    if (!ALLOWED.has(file.type)) {
      return NextResponse.json(
        { error: "Unsupported file type" },
        { status: 400 },
      );
    }
    if (file.size > 8 * 1024 * 1024) {
      return NextResponse.json(
        { error: "File too large (max 8MB)" },
        { status: 400 },
      );
    }

    const ext =
      file.type === "image/jpeg"
        ? "jpg"
        : file.type === "image/svg+xml"
          ? "svg"
          : file.type.split("/")[1] || "png";

    const filename = `${Date.now()}-${randomUUID().slice(0, 8)}.${ext}`;
    const buffer = Buffer.from(await file.arrayBuffer());

    // Vercel (and other serverless hosts) use a read-only filesystem.
    // Prefer Blob storage when the token is configured.
    if (process.env.BLOB_READ_WRITE_TOKEN) {
      const blob = await put(`uploads/${filename}`, buffer, {
        access: "public",
        contentType: file.type,
        token: process.env.BLOB_READ_WRITE_TOKEN,
      });
      return NextResponse.json({ url: blob.url });
    }

    if (process.env.VERCEL) {
      return NextResponse.json(
        {
          error:
            "Blob storage is not configured. Add a Vercel Blob store and set BLOB_READ_WRITE_TOKEN.",
        },
        { status: 500 },
      );
    }

    // Local / self-hosted fallback
    const uploadDir = path.join(process.cwd(), "public", "uploads");
    await fs.mkdir(uploadDir, { recursive: true });
    await fs.writeFile(path.join(uploadDir, filename), buffer);

    return NextResponse.json({ url: `/uploads/${filename}` });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("[admin/upload]", error);
    const message =
      error instanceof Error && error.message
        ? error.message
        : "Upload failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
