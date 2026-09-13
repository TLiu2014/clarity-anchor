import type { Metadata } from "next";
import { Docs } from "@/components/site/Docs";

export const metadata: Metadata = {
  title: "Docs — ClarityAnchor",
  description:
    "How ClarityAnchor works: the Strands agent, its tools, the ERP human-in-the-loop pause, anchors, and the architecture.",
};

export default function DocsPage() {
  return <Docs />;
}
