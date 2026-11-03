"use client";

import Link from "next/link";
import { ArrowLeft, ShieldCheck, Lock, Eye, FileText, CheckCircle2 } from "lucide-react";
import BrandLogo from "../components/BrandLogo";

export default function PrivacyPage() {
  return (
    <div style={{ minHeight: "100vh", background: "#f8fafc", color: "#334155", overflowY: "auto", fontFamily: "var(--font-sans)" }}>
      {/* Header */}
      <header
        style={{
          background: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)",
          color: "#ffffff",
          padding: "48px 24px",
          textAlign: "center",
          borderBottom: "1px solid rgba(255, 255, 255, 0.1)",
        }}
      >
        <div style={{ maxWidth: "860px", margin: "0 auto" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
            <Link
              href="/login"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                color: "#94a3b8",
                textDecoration: "none",
                fontSize: "14px",
                fontWeight: "500",
                transition: "color 0.15s ease",
              }}
            >
              <ArrowLeft size={16} /> Back
            </Link>
            <BrandLogo size={32} iconOnly />
          </div>

          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              padding: "6px 14px",
              background: "rgba(16, 185, 129, 0.15)",
              border: "1px solid rgba(16, 185, 129, 0.3)",
              color: "#34d399",
              fontSize: "12px",
              fontWeight: "600",
              borderRadius: "999px",
              marginBottom: "16px",
            }}
          >
            <ShieldCheck size={14} /> Official Meta Cloud API Compliance
          </div>

          <h1 style={{ fontSize: "32px", fontWeight: "800", margin: "0 0 12px 0", letterSpacing: "-0.02em" }}>
            Privacy Policy
          </h1>
          <p style={{ fontSize: "15px", color: "#94a3b8", maxWidth: "600px", margin: "0 auto", lineHeight: 1.6 }}>
            How Assudani WA Automations protects, manages, and safeguards client credentials and WhatsApp messaging communications.
          </p>
          <div style={{ marginTop: "16px", fontSize: "12px", color: "#64748b" }}>
            Last Updated: November 2026 &bull; Effective Immediately
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main style={{ maxWidth: "860px", margin: "-20px auto 60px", padding: "0 20px", position: "relative", zIndex: 10 }}>
        <div
          style={{
            background: "#ffffff",
            borderRadius: "16px",
            padding: "36px 32px",
            boxShadow: "0 4px 6px -1px rgba(15, 23, 42, 0.05), 0 2px 4px -2px rgba(15, 23, 42, 0.05)",
            border: "1px solid #e2e8f0",
            lineHeight: 1.7,
          }}
        >
          <section style={{ marginBottom: "32px" }}>
            <h2 style={{ fontSize: "20px", fontWeight: "700", color: "#0f172a", marginBottom: "12px", display: "flex", alignItems: "center", gap: "8px" }}>
              <Lock size={20} color="#059669" /> 1. Overview &amp; Commitment
            </h2>
            <p style={{ margin: 0, fontSize: "14px" }}>
              Assudani&apos;s WP Automation provides enterprise-grade WhatsApp Cloud API marketing, CRM synchronization, and automated communication solutions. We respect the privacy of our business clients and their customers, complying with applicable data protection laws and Meta Platform Terms.
            </p>
          </section>

          <section style={{ marginBottom: "32px" }}>
            <h2 style={{ fontSize: "20px", fontWeight: "700", color: "#0f172a", marginBottom: "12px", display: "flex", alignItems: "center", gap: "8px" }}>
              <FileText size={20} color="#059669" /> 2. Information We Process
            </h2>
            <ul style={{ margin: "0 0 0 20px", padding: 0, fontSize: "14px" }}>
              <li><strong>Contact Information:</strong> Phone numbers, customer names, and optional location/city tags imported into broadcast lists.</li>
              <li><strong>Message Metadata:</strong> Delivery statuses (sent, delivered, read, failed), timestamps, and template identifiers.</li>
              <li><strong>Inbound Communications:</strong> Text and media messages sent by end-users to the official WhatsApp business phone number for live-agent support.</li>
            </ul>
          </section>

          <section style={{ marginBottom: "32px" }}>
            <h2 style={{ fontSize: "20px", fontWeight: "700", color: "#0f172a", marginBottom: "12px", display: "flex", alignItems: "center", gap: "8px" }}>
              <CheckCircle2 size={20} color="#059669" /> 3. Data Protection &amp; Security
            </h2>
            <p style={{ margin: 0, fontSize: "14px" }}>
              All API communications are encrypted via HTTPS/TLS 1.3 in transit. Passwords are cryptographically hashed using standard bcrypt hashing algorithms. Access tokens and Meta Cloud credentials are encrypted and stored within isolated server environments.
            </p>
          </section>

          <section style={{ marginBottom: "32px" }}>
            <h2 style={{ fontSize: "20px", fontWeight: "700", color: "#0f172a", marginBottom: "12px", display: "flex", alignItems: "center", gap: "8px" }}>
              <Eye size={20} color="#059669" /> 4. No Third-Party Selling
            </h2>
            <p style={{ margin: 0, fontSize: "14px" }}>
              Assudani&apos;s WP Automation does not sell, rent, or monetize client contact lists or customer communications. Data is solely processed to facilitate verified WhatsApp Cloud API broadcasts and live chat operations.
            </p>
          </section>

          <section>
            <h2 style={{ fontSize: "20px", fontWeight: "700", color: "#0f172a", marginBottom: "12px" }}>
              5. Contact Us
            </h2>
            <p style={{ margin: 0, fontSize: "14px" }}>
              For questions regarding this privacy policy or data inquiries, reach out to our team at <strong>support@assudani.com</strong>.
            </p>
          </section>
        </div>
      </main>
    </div>
  );
}
