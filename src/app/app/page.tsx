import type { Metadata } from "next";
import { AppShell } from "@/components/AppShell";

export const metadata: Metadata = {
  title: "ClarityAnchor — app",
};

export default function AppPage() {
  return <AppShell />;
}
