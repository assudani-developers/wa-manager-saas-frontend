"use client";

import { usePathname } from "next/navigation";

export default function AppFooter() {
  const pathname = usePathname();

  // Hide the global app footer on login page
  if (pathname === "/login") {
    return null;
  }

  return (
    <footer
      className="app-footer"
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "9px 24px",
        fontSize: "12px",
        color: "var(--text-muted)",
        borderTop: "1px solid var(--border-color)",
        background: "var(--bg-secondary)",
        flexShrink: 0,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
        <span
          style={{
            display: "inline-block",
            width: "7px",
            height: "7px",
            borderRadius: "50%",
            background: "#10b981",
            boxShadow: "0 0 6px #10b981",
          }}
        />
        <span style={{ fontWeight: 500 }}>Meta Cloud API Active</span>
      </div>
      <div style={{ textAlign: "center", color: "var(--text-secondary)", fontSize: "12px" }}>
        &copy; 2026 <strong style={{ color: "var(--text-primary)" }}>Assudani WA Automations</strong>. All rights reserved.
        <span style={{ margin: "0 8px", opacity: 0.4 }}>|</span>
        <span>Designed &amp; Developed by <strong>Assudani Group</strong> &amp; <a href="https://piyushassudani.in" target="_blank" rel="noopener noreferrer" style={{ color: "var(--secondary-accent)", textDecoration: "none", fontWeight: 600 }}>piyushassudani.in</a></span>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
        <a
          href="/privacy"
          target="_blank"
          rel="noreferrer"
          className="footer-link"
        >
          Privacy Policy
        </a>
      </div>
    </footer>
  );
}
