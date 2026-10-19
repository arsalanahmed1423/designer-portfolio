import "server-only";

import { revalidatePath } from "next/cache";
import {
  readDataJson,
  writeDataJson,
  type DataFile,
} from "@/lib/dataStore";
import type { Project } from "@/lib/projects";
import type { WorkItem } from "@/lib/work";

async function readJson<T>(file: DataFile): Promise<T> {
  const data = await readDataJson<T>(file);
  if (data === null) {
    throw new Error(`Missing data file: ${file}`);
  }
  return data;
}

async function writeJson(file: DataFile, data: unknown) {
  await writeDataJson(file, data);
}

export function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

export async function getWorkItems(): Promise<WorkItem[]> {
  return readJson<WorkItem[]>("work.json");
}

export async function saveWorkItems(items: WorkItem[]) {
  await writeJson("work.json", items);
  revalidatePath("/", "layout");
  revalidatePath("/");
  revalidatePath("/work");
  revalidatePath("/admin");
  revalidatePath("/admin/projects");
}

export async function getProjects(): Promise<Project[]> {
  const projects = await readDataJson<Project[]>("projects.json");
  if (projects) return projects;

  const legacy = await readDataJson<Project[]>("case-studies.json");
  if (legacy) return legacy;

  return [];
}

export async function saveProjects(projects: Project[]) {
  await writeJson("projects.json", projects);
  // Keep legacy file in sync during migration
  await writeJson("case-studies.json", projects);
  revalidatePath("/", "layout");
  revalidatePath("/");
  revalidatePath("/work");
  revalidatePath("/admin");
  revalidatePath("/admin/projects");
  for (const project of projects) {
    revalidatePath(`/work/${project.slug}`);
    revalidatePath(`/admin/projects/${project.slug}`);
  }
}

export async function getProjectBySlug(slug: string) {
  const projects = await getProjects();
  return projects.find((project) => project.slug === slug) ?? null;
}

export async function getNextProjectBySlug(slug: string) {
  const projects = await getProjects();
  const index = projects.findIndex((project) => project.slug === slug);
  if (index < 0 || projects.length === 0) return null;
  return projects[(index + 1) % projects.length] ?? null;
}

/** @deprecated Use getProjects */
export const getCaseStudies = getProjects;
/** @deprecated Use getProjectBySlug */
export const getCaseStudyBySlug = getProjectBySlug;
/** @deprecated Use getNextProjectBySlug */
export const getNextCaseStudyBySlug = getNextProjectBySlug;
/** @deprecated Use saveProjects */
export const saveCaseStudies = saveProjects;

export async function getContentStats() {
  const [work, projects] = await Promise.all([getWorkItems(), getProjects()]);
  const years = [...new Set(work.map((item) => item.year))].sort();
  const withDetail = work.filter(
    (item) => item.href && item.href.startsWith("/work/"),
  );

  return {
    totalWork: work.length,
    projects: work.length,
    caseStudies: projects.length,
    projectDetails: projects.length,
    featured: withDetail.length,
    yearsCovered: years.length,
    latestYear: years.at(-1) ?? "—",
    recentWork: work.slice(0, 5),
  };
}

export function workItemFromProject(
  project: Project,
  extras?: Partial<WorkItem>,
): WorkItem {
  const industry =
    project.meta.find((item) => item.label.toLowerCase() === "industry")
      ?.value ??
    extras?.meta ??
    "Project";
  const year =
    project.meta.find((item) => item.label.toLowerCase() === "year")?.value ??
    extras?.year ??
    new Date().getFullYear().toString();

  return {
    id: project.slug,
    name: project.title,
    meta: industry,
    year,
    image: project.cover,
    category: "project",
    aspect: extras?.aspect ?? "346 / 260",
    href: `/work/${project.slug}`,
    comingSoon: extras?.comingSoon,
    selectedWork: extras?.selectedWork,
  };
}

/** @deprecated Use workItemFromProject */
export const workItemFromCaseStudy = workItemFromProject;
