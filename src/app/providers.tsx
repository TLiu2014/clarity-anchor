"use client";

import { ThemeProvider } from "next-themes";
import type { ReactNode } from "react";

/**
 * Client-side providers. next-themes drives the `.dark` class on <html>,
 * matching Tailwind's `darkMode: "class"` strategy.
 */
export function Providers({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      {children}
    </ThemeProvider>
  );
}
