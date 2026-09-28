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

async function readBlobJson<T>(file: DataFile): Promise<T | null> {
  const result = await get(`data/${file}`, {
    access: "public",
    useCache: false,
    token: process.env.BLOB_READ_WRITE_TOKEN,
  });

  if (!result || result.statusCode !== 200 || !result.stream) {
    return null;
  }

  const raw = await streamToText(result.stream);
  return JSON.parse(raw) as T;
}

async function writeBlobJson(file: DataFile, data: unknown) {
  await put(`data/${file}`, `${JSON.stringify(data, null, 2)}\n`, {
    access: "public",
    contentType: "application/json",
    addRandomSuffix: false,
    allowOverwrite: true,
    cacheControlMaxAge: 60,
    token: process.env.BLOB_READ_WRITE_TOKEN,
  });
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
