import "server-only";

import { promises as fs } from "fs";
import path from "path";
import { get, put } from "@vercel/blob";

export type DataFile = "work.json" | "projects.json" | "case-studies.json";

const dataDir = path.join(process.cwd(), "data");

function blobEnabled() {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN);
}

function localPath(file: DataFile) {
  return path.join(dataDir, file);
}

async function streamToText(stream: ReadableStream<Uint8Array>) {
  return new Response(stream).text();
}

async function readLocalJson<T>(file: DataFile): Promise<T | null> {
  try {
    const raw = await fs.readFile(localPath(file), "utf8");
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

async function writeLocalJson(file: DataFile, data: unknown) {
  await fs.mkdir(dataDir, { recursive: true });
  await fs.writeFile(
    localPath(file),
    `${JSON.stringify(data, null, 2)}\n`,
    "utf8",
  );
}

function getBlobStoreHost(): string | null {
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (token) {
    const match = token.match(/^vercel_blob_rw_([a-zA-Z0-9]+)_/);
    if (match) return `${match[1].toLowerCase()}.public.blob.vercel-storage.com`;
  }
  if (process.env.BLOB_STORE_ID) {
    const id = process.env.BLOB_STORE_ID.replace(/^store_/, "").toLowerCase();
    return `${id}.public.blob.vercel-storage.com`;
  }
  return null;
}

async function readBlobJson<T>(file: DataFile): Promise<T | null> {
  // Support both "data/${file}" and root "${file}" in the Blob store
  const candidates = [`data/${file}`, file];
  const host = getBlobStoreHost();

  for (const pathname of candidates) {
    // 1) Direct HTTP fetch with cache: 'no-store' to bypass Next.js Data Cache & CDN
    if (host) {
      try {
        const url = `https://${host}/${pathname}?_t=${Date.now()}`;
        const res = await fetch(url, {
          cache: "no-store",
          headers: {
            "Cache-Control": "no-cache, no-store, must-revalidate",
            Pragma: "no-cache",
          },
        });
        if (res.ok) {
          const raw = await res.text();
          return JSON.parse(raw) as T;
        }
      } catch {
        // Fall back to Blob SDK get
      }
    }

    // 2) Fallback: @vercel/blob get() with no-cache headers
    try {
      const result = await get(pathname, {
        access: "public",
        useCache: false,
        headers: {
          "Cache-Control": "no-cache, no-store, must-revalidate",
          Pragma: "no-cache",
        },
        token: process.env.BLOB_READ_WRITE_TOKEN,
      });

      if (result && result.statusCode === 200 && result.stream) {
        const raw = await streamToText(result.stream);
        return JSON.parse(raw) as T;
      }
    } catch {
      // Continue to next candidate path
    }
  }
  return null;
}

async function writeBlobJson(file: DataFile, data: unknown) {
  const content = `${JSON.stringify(data, null, 2)}\n`;
  const options = {
    access: "public" as const,
    contentType: "application/json",
    addRandomSuffix: false,
    allowOverwrite: true,
    cacheControlMaxAge: 60,
    token: process.env.BLOB_READ_WRITE_TOKEN,
  };

  // Sync to both data/ prefix and root for full compatibility
  await Promise.all([
    put(`data/${file}`, content, options),
    put(file, content, options),
  ]);
}

/**
 * Read CMS JSON. On Vercel Blob:
 * 1) try Blob
 * 2) if missing, seed from the deployed `data/` files, then return
 * Locally without a token: read from disk.
 */
export async function readDataJson<T>(file: DataFile): Promise<T | null> {
  if (blobEnabled()) {
    const fromBlob = await readBlobJson<T>(file);
    if (fromBlob !== null) return fromBlob;

    const fromLocal = await readLocalJson<T>(file);
    if (fromLocal === null) return null;

    try {
      await writeBlobJson(file, fromLocal);
    } catch (error) {
      console.error(`[dataStore] failed to seed ${file} to Blob`, error);
    }
    return fromLocal;
  }

  return readLocalJson<T>(file);
}

/**
 * Persist CMS JSON. Uses Vercel Blob when configured; otherwise local disk.
 */
export async function writeDataJson(file: DataFile, data: unknown) {
  if (blobEnabled()) {
    await writeBlobJson(file, data);
    return;
  }

  if (process.env.VERCEL) {
    throw new Error(
      "Blob storage is not configured. Create a Vercel Blob store and set BLOB_READ_WRITE_TOKEN.",
    );
  }

  await writeLocalJson(file, data);
}

export function isBlobStorageConfigured() {
  return blobEnabled();
}
