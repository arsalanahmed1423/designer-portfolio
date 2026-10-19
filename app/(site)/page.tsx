import About from "@/components/About";
import CaseStudies from "@/components/CaseStudies";
import Clients from "@/components/Clients";
import Footer from "@/components/Footer";
import Hero from "@/components/Hero";
import OtherProjects from "@/components/OtherProjects";
import Showreel from "@/components/Showreel";
import { getProjects, getWorkItems } from "@/lib/content";

export const dynamic = "force-dynamic";

export default async function Home() {
  const [workItems, projects] = await Promise.all([
    getWorkItems(),
    getProjects(),
  ]);

  const detailMap = new Map(projects.map((p) => [p.slug, p]));

  // Selected work items matching the homepage featured table
  const selectedItems = workItems.filter((item) => item.selectedWork);
  const studiesList = selectedItems.length > 0 ? selectedItems : workItems;

  const featuredProjects = studiesList.map((item) => {
    const detail = detailMap.get(item.id);
    return {
      name: detail?.title ?? item.name,
      type:
        detail?.meta.find((m) => m.label.toLowerCase() === "industry")?.value ??
        item.meta,
      year:
        detail?.meta.find((m) => m.label.toLowerCase() === "year")?.value ??
        item.year,
      href: detail ? `/work/${detail.slug}` : (item.href ?? "#"),
      image: detail?.cover ?? item.image,
      comingSoon: item.comingSoon,
    };
  });

  return (
    <main className="flex flex-1 flex-col">
      <Hero />
      <Showreel />
      <Clients />
      <CaseStudies studies={featuredProjects} />
      <OtherProjects items={workItems} />
      <About />
      <Footer workItems={workItems} />
    </main>
  );
}
