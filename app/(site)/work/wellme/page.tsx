import type { Metadata } from "next";
import WellMeCaseStudy from "@/components/case-studies/WellMeCaseStudy";
import { getWorkItems } from "@/lib/content";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "WellMe — Case Study — Syed Saqib Abbas",
  description:
    "Case study: WellMe, an AI wellness therapy coach designed for people under sustained pressure.",
};

export default async function WellMeCaseStudyPage() {
  const workItems = await getWorkItems();
  return <WellMeCaseStudy workItems={workItems} />;
}
