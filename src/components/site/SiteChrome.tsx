"use client";

import Link from "next/link";
import { ThemeToggle } from "@/components/ThemeToggle";

export const GITHUB_URL = "https://github.com/TLiu2014/clarity-anchor";

export function BrandMark() {
  return (
    <span className="flex items-center gap-2.5">
      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 text-white shadow-sm">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
          <circle cx="12" cy="5" r="2.5" />
          <path d="M12 7.5V21M5 13a7 7 0 0 0 14 0M4 13h2M18 13h2" />
        </svg>
      </span>
      <span className="text-base font-bold tracking-tight text-slate-900 dark:text-slate-50">
        ClarityAnchor
      </span>
    </span>
  );
}

export function SiteNav({ active }: { active?: "home" | "docs" }) {
  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/80 backdrop-blur dark:border-slate-800 dark:bg-slate-950/70">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
        <Link href="/" aria-label="ClarityAnchor home">
          <BrandMark />
        </Link>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Link
            href={active === "docs" ? "/" : "/docs"}
            className="rounded-lg px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-slate-100"
          >
            {active === "docs" ? "Home" : "Docs"}
          </Link>
          <Link
            href="/app"
            className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:from-indigo-400 hover:to-violet-500"
          >
            Launch app
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
              <path d="M5 12h14M13 6l6 6-6 6" />
            </svg>
          </Link>
        </div>
      </div>
    </header>
  );
}

export const HACKATHON_URL = "https://agentsforhumans.devpost.com/";

export function SiteFooter() {
  return (
    <footer className="border-t border-slate-200 py-8 dark:border-slate-800">
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-3 px-6 text-center text-sm text-slate-500 dark:text-slate-400">
        <span>ClarityAnchor · an AI Reality Anchor for OCD &amp; anxiety.</span>
        <span className="text-xs">
          Built with AWS Strands Agents + Amazon Bedrock for the{" "}
          <a
            href={HACKATHON_URL}
            target="_blank"
            rel="noreferrer"
            className="font-medium text-indigo-600 hover:underline dark:text-indigo-400"
          >
            AWS “Agents for Humans” Hackathon
          </a>
          . Not a substitute for professional care.
        </span>
      </div>
    </footer>
  );
}
