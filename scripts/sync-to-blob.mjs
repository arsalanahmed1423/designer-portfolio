import { put } from "@vercel/blob";
import fs from "fs";
import path from "path";

// Load .env.local if not already in process.env
const envLocalPath = path.join(process.cwd(), ".env.local");
if (fs.existsSync(envLocalPath)) {
  const envContent = fs.readFileSync(envLocalPath, "utf8");
  for (const line of envContent.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const [key, ...values] = trimmed.split("=");
    const val = values.join("=").replace(/^["']|["']$/g, "");
    if (key && !process.env[key]) {
      process.env[key] = val;
    }
  }
}

const token = process.env.BLOB_READ_WRITE_TOKEN;

if (!token) {
  console.error("Error: BLOB_READ_WRITE_TOKEN is not set in .env.local or environment.");
  process.exit(1);
}

const files = ["work.json", "projects.json", "case-studies.json"];

async function sync() {
  console.log("Syncing local data files to Vercel Blob store...\n");

  for (const file of files) {
    const filePath = path.join(process.cwd(), "data", file);
    if (!fs.existsSync(filePath)) {
      console.warn(`File data/${file} does not exist, skipping.`);
      continue;
    }

    const content = fs.readFileSync(filePath, "utf8");
    const parsed = JSON.parse(content);
    const count = Array.isArray(parsed) ? parsed.length : 1;

    console.log(`Uploading data/${file} (${count} items)...`);

    const options = {
      access: "public",
      contentType: "application/json",
      addRandomSuffix: false,
      allowOverwrite: true,
      cacheControlMaxAge: 60,
      token,
    };

    // Upload to both data/${file} and root ${file}
    const res1 = await put(`data/${file}`, content, options);
    const res2 = await put(file, content, options);

    console.log(`✓ Uploaded data/${file} -> ${res1.url}`);
    console.log(`✓ Uploaded ${file} -> ${res2.url}\n`);
  }

  console.log("All local data files have been successfully synced to Vercel Blob!");
}

sync().catch((err) => {
  console.error("Sync failed:", err);
  process.exit(1);
});
