import { DevHealthStatus } from "./dev-health-status";

import { formatIsoDateTime } from "@/lib/datetime";

const sampleApiDateTime = "2026-04-01T14:00:00.000Z";

export default function Page() {
  return (
    <main style={{ padding: "1.5rem", maxWidth: 640 }}>
      <h1>Studiqo</h1>
      <p>Next.js workspace scaffold with Phase 0 providers and API client.</p>
      <p style={{ fontSize: 14, opacity: 0.85 }}>
        Sample formatted API date-time: {formatIsoDateTime(sampleApiDateTime)}
      </p>
      <DevHealthStatus />
    </main>
  );
}
