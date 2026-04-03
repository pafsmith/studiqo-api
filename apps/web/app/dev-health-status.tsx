"use client";

import { useEffect, useState } from "react";

import { fetchHealth } from "@/lib/api/health";

/** Fetches `GET /health` once in development to exercise typed OpenAPI client usage. */
export function DevHealthStatus() {
  const [line, setLine] = useState<string>("…");

  useEffect(() => {
    if (process.env.NODE_ENV !== "development") return;
    void (async () => {
      try {
        const { message } = await fetchHealth();
        setLine(message);
      } catch (e) {
        setLine(e instanceof Error ? e.message : "error");
      }
    })();
  }, []);

  if (process.env.NODE_ENV !== "development") {
    return null;
  }

  return (
    <p style={{ fontSize: 14, opacity: 0.85 }}>API health (dev): {line}</p>
  );
}
