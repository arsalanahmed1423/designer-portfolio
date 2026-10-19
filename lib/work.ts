export type WorkCategory = "case-study" | "project";

export type WorkItem = {
  id: string;
  name: string;
  meta: string;
  year: string;
  image: string;
  category: WorkCategory;
  aspect?: string;
  href?: string;
  comingSoon?: boolean;
  selectedWork?: boolean;
};

export function filterWorkItems(
  items: WorkItem[],
  filter: "all" | "case-studies" | "featured",
) {
  if (filter === "case-studies") {
    return items.filter((item) => item.category === "case-study");
  }
  if (filter === "featured") {
    return items.filter((item) =>
      Boolean(item.href && item.href.startsWith("/work/")),
    );
  }
  return items;
}

/** Distribute work items into n columns for masonry-style grids. */
export function toProjectColumns(items: WorkItem[], columnCount = 4) {
  const columns: WorkItem[][] = Array.from(
    { length: columnCount },
    () => [],
  );
  items.forEach((item, index) => {
    columns[index % columnCount]?.push(item);
  });
  return columns;
}
