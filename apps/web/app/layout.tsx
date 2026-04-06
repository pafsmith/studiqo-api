import { Fraunces, Geist } from "next/font/google";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

import { Providers } from "./providers";

import "./globals.css";

const geist = Geist({ subsets: ["latin"], variable: "--font-sans" });

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
});

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html
      lang="en"
      className={cn(geist.variable, fraunces.variable, "font-sans")}
    >
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
