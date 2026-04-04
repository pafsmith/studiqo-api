import type { ReactNode } from "react";

export default function AppShellLayout({ children }: { children: ReactNode }) {
  return (
    <div style={{ minHeight: "100vh", fontFamily: "system-ui, sans-serif" }}>
      <header
        style={{
          padding: "12px 20px",
          borderBottom: "1px solid #e5e5e5",
          display: "flex",
          gap: 16,
          alignItems: "center",
        }}
      >
        <a href="/" style={{ fontWeight: 600, color: "#111", textDecoration: "none" }}>
          Studiqo
        </a>
        <nav style={{ display: "flex", gap: 12, fontSize: 14 }}>
          <a href="/login">Log in</a>
          <a href="/register">Register</a>
          <a href="/onboarding">Organizations</a>
        </nav>
      </header>
      {children}
    </div>
  );
}
