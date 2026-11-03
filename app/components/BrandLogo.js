"use client";

import React from "react";

export default function BrandLogo({ size = 36, showText = false, textClassName = "", iconOnly = false }) {
  const radius = Math.round(size * 0.24);

  return (
    <div style={{ display: "inline-flex", alignItems: "center", gap: "10px", textDecoration: "none" }}>
      <div
        style={{
          width: `${size}px`,
          height: `${size}px`,
          minWidth: `${size}px`,
          minHeight: `${size}px`,
          borderRadius: `${radius}px`,
          boxShadow: "0 4px 14px rgba(0, 34, 119, 0.25)",
          overflow: "hidden",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#001744",
          flexShrink: 0,
        }}
      >
        <img
          src="/logo.png"
          alt="Assudani WA Automations Logo"
          width={size}
          height={size}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            display: "block",
          }}
        />
      </div>

      {showText && !iconOnly && (
        <div style={{ display: "flex", flexDirection: "column", textAlign: "left", lineHeight: 1.15 }}>
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <span style={{ fontSize: "16px", fontWeight: "800", letterSpacing: "-0.02em", color: "var(--text-primary)" }}>
              Assudani <span style={{ color: "var(--secondary-accent)" }}>WA Automations</span>
            </span>
            <span
              style={{
                fontSize: "10px",
                fontWeight: "700",
                textTransform: "uppercase",
                letterSpacing: "0.06em",
                padding: "2px 6px",
                borderRadius: "4px",
                background: "rgba(15, 59, 168, 0.12)",
                color: "var(--accent)",
                border: "1px solid rgba(15, 59, 168, 0.25)",
              }}
            >
              PRO
            </span>
          </div>
          <span style={{ fontSize: "11px", color: "var(--text-muted)", fontWeight: "500", marginTop: "2px" }}>
            WhatsApp Marketing &amp; CRM
          </span>
        </div>
      )}
    </div>
  );
}
