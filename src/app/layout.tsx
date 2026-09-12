import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "./providers";

export const metadata: Metadata = {
  title: "ClarityAnchor",
  description:
    "An AI-powered Reality Anchor for OCD and anxiety — visualize and de-escalate cognitive loops.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="h-full">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
