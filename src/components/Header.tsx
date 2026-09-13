"use client";

import Link from "next/link";
import { ThemeToggle } from "./ThemeToggle";
import { SettingsMenu } from "./SettingsMenu";
import { ConnectionPill } from "./ConnectionPill";

export function Header() {
  return (
    <header className="z-30 flex shrink-0 items-center justify-between border-b border-slate-200 bg-white/80 px-4 py-2.5 backdrop-blur dark:border-slate-800 dark:bg-slate-900/80">
      <Link
        href="/"
        aria-label="ClarityAnchor home"
        className="flex items-center gap-2.5 rounded-lg transition hover:opacity-80"
      >
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 text-white shadow-sm">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
            <circle cx="12" cy="5" r="2.5" />
            <path d="M12 7.5V21M5 13a7 7 0 0 0 14 0M4 13h2M18 13h2" />
          </svg>
        </span>
        <div className="leading-tight">
          <h1 className="text-base font-bold tracking-tight text-slate-900 dark:text-slate-50">
            ClarityAnchor
          </h1>
          <p className="hidden text-[11px] text-slate-500 sm:block dark:text-slate-400">
            Your objective Reality Anchor for OCD &amp; anxiety
          </p>
        </div>
      </Link>

      <div className="flex items-center gap-2.5">
        <ConnectionPill />
        <SettingsMenu />
        <ThemeToggle />
      </div>
    </header>
  );
}
