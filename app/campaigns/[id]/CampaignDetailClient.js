"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Users,
  CheckCircle2,
  XCircle,
  Clock,
  Filter,
  Activity,
  MessageSquare,
  Image as ImageIcon,
  Download,
  RotateCw,
  AlertTriangle,
  ShieldAlert,
  Zap,
  HelpCircle,
  ChevronDown
} from "lucide-react";
import api, { normalizeMediaUrl } from "../../lib/api";
import { format } from "date-fns";
import { useToast } from "../../components/ToastProvider";

export default function CampaignDetailPage() {
  const { id } = useParams();
  const { showSuccess, showError } = useToast();

  const [campaign, setCampaign] = useState(null);
  const [recipients, setRecipients] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState("overview"); // overview, messages, analytics
  const [filter, setFilter] = useState("all");

  const [isAdmin, setIsAdmin] = useState(false);
  const [retrying, setRetrying] = useState(false);
  const [retryingId, setRetryingId] = useState(null);
  const [exporting, setExporting] = useState(false);
  const [showRetryMenu, setShowRetryMenu] = useState(false);

  // Check admin privileges for Excel Export
  useEffect(() => {
    try {
      const role = localStorage.getItem("user_role");
      const userStr = localStorage.getItem("user");
      const user = userStr ? JSON.parse(userStr) : null;
      const isMaster = role === "master_admin" || user?.role === "master_admin" || user?.username?.toLowerCase() === "piyushassudani";
      const admin = isMaster || role === "admin" || user?.role === "admin";
      setIsAdmin(admin);
    } catch (e) {}
  }, []);

  const fetchData = useCallback(async () => {
    try {
      const [campRes, recRes, tmplRes] = await Promise.all([
        api.get(`/api/campaigns/${id}`),
        api.get(`/api/campaigns/${id}/recipients`),
        api.get("/api/templates").catch(() => ({ data: [] }))
      ]);
      setCampaign(campRes.data);
      setRecipients(recRes.data || []);
      setTemplates(tmplRes.data || []);
    } catch (err) {
      console.error("Failed to fetch campaign data:", err);
      setError("Failed to load campaign data");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (id) fetchData();
  }, [id, fetchData]);

  const template = templates?.find((t) => t.name === campaign?.template_name);
  const header = template?.components?.find((c) => c.type === "HEADER");
  const body = template?.components?.find((c) => c.type === "BODY");
  const footer = template?.components?.find((c) => c.type === "FOOTER");
  const buttonsComp = template?.components?.find((c) => c.type === "BUTTONS");

  const campaignMediaUrl = campaign?.media_url
    ? normalizeMediaUrl(campaign.media_url)
    : header?.example?.header_handle?.[0]?.startsWith("http")
    ? header.example.header_handle[0]
    : null;

  const getDerivedStatus = (status, errorMessage) => {
    const s = status?.toLowerCase() || "unknown";
    if (s === "failed") {
      const err = (errorMessage || "").toLowerCase();
      if (err.includes("undeliverable") || err.includes("not on whatsapp") || err.includes("131026")) {
        return "not-on-whatsapp";
      }
      if (
        err.includes("ecosystem") ||
        err.includes("spam") ||
        err.includes("re-engagement") ||
        err.includes("131047") ||
        err.includes("131049") ||
        err.includes("frequency")
      ) {
        return "spam-filtered";
      }
      if (
        err.includes("rate limit") ||
        err.includes("throughput") ||
        err.includes("130429") ||
        err.includes("131048") ||
        err.includes("tier")
      ) {
        return "rate-limit";
      }
      if (
        err.includes("header") ||
        err.includes("parameter") ||
        err.includes("template") ||
        err.includes("132000") ||
        err.includes("132001")
      ) {
        return "template-mismatch";
      }
      return "other-failed";
    }
    return s;
  };

  // Detailed categories breakdown counts
  const categoryCounts = useMemo(() => {
    const counts = {
      all: recipients.length,
      sent: 0,
      delivered: 0,
      read: 0,
      failed: 0,
      "not-on-whatsapp": 0,
      "spam-filtered": 0,
      "rate-limit": 0,
      "template-mismatch": 0,
      "other-failed": 0,
    };

    recipients.forEach((r) => {
      const derived = getDerivedStatus(r.status, r.error_message);
      if (r.status === "read") {
        counts.read++;
        counts.delivered++;
        counts.sent++;
      } else if (r.status === "delivered") {
        counts.delivered++;
        counts.sent++;
      } else if (r.status === "sent") {
        counts.sent++;
      } else if (r.status === "failed") {
        counts.failed++;
        if (counts[derived] !== undefined) {
          counts[derived]++;
        } else {
          counts["other-failed"]++;
        }
      }
    });

    return counts;
  }, [recipients]);

  const totalContacts = categoryCounts.all;
  const readCount = categoryCounts.read;
  const deliveredCount = categoryCounts.delivered;
  const sentCount = categoryCounts.sent;
  const failedCount = categoryCounts.failed;

  const engagementRate = deliveredCount > 0 ? ((readCount / deliveredCount) * 100).toFixed(1) : "0.0";
  const deliveryRate = sentCount > 0 ? ((deliveredCount / sentCount) * 100).toFixed(1) : "0.0";

  const getStatusBadge = (status, errorMessage) => {
    const derivedStatus = getDerivedStatus(status, errorMessage);
    const resolvedErr = errorMessage || "Meta delivery failed";

    switch (derivedStatus) {
      case "read":
        return (
          <span style={{ color: "#34B7F1", display: "inline-flex", alignItems: "center", gap: "5px", fontWeight: "600" }}>
            <CheckCircle2 size={14} /> Read
          </span>
        );
      case "delivered":
        return (
          <span style={{ color: "var(--status-delivered, #10b981)", display: "inline-flex", alignItems: "center", gap: "5px", fontWeight: "600" }}>
            <CheckCircle2 size={14} /> Delivered
          </span>
        );
      case "sent":
        return (
          <span style={{ color: "#8b5cf6", display: "inline-flex", alignItems: "center", gap: "5px", fontWeight: "600" }}>
            <Clock size={14} /> Sent
          </span>
        );
      case "not-on-whatsapp":
        return (
          <span
            style={{ color: "#ef4444", background: "#fef2f2", padding: "3px 8px", borderRadius: "6px", display: "inline-flex", alignItems: "center", gap: "5px", fontWeight: "600", fontSize: "12px" }}
            title={resolvedErr}
          >
            <XCircle size={14} /> Not on WA
          </span>
        );
      case "spam-filtered":
        return (
          <span
            style={{ color: "#dc2626", background: "#fee2e2", padding: "3px 8px", borderRadius: "6px", display: "inline-flex", alignItems: "center", gap: "5px", fontWeight: "600", fontSize: "12px" }}
            title={resolvedErr}
          >
            <ShieldAlert size={14} /> Spam / Blocked
          </span>
        );
      case "rate-limit":
        return (
          <span
            style={{ color: "#d97706", background: "#fef3c7", padding: "3px 8px", borderRadius: "6px", display: "inline-flex", alignItems: "center", gap: "5px", fontWeight: "600", fontSize: "12px" }}
            title={resolvedErr}
          >
            <Zap size={14} /> Rate Limit
          </span>
        );
      case "template-mismatch":
        return (
          <span
            style={{ color: "#b45309", background: "#fef3c7", padding: "3px 8px", borderRadius: "6px", display: "inline-flex", alignItems: "center", gap: "5px", fontWeight: "600", fontSize: "12px" }}
            title={resolvedErr}
          >
            <AlertTriangle size={14} /> Template Error
          </span>
        );
      case "other-failed":
      case "failed":
        return (
          <span
            style={{ color: "#ef4444", background: "#fef2f2", padding: "3px 8px", borderRadius: "6px", display: "inline-flex", alignItems: "center", gap: "5px", fontWeight: "600", fontSize: "12px" }}
            title={resolvedErr}
          >
            <XCircle size={14} /> Failed
          </span>
        );
      default:
        return (
          <span style={{ color: "var(--text-muted)", display: "inline-flex", alignItems: "center", gap: "5px", textTransform: "capitalize" }}>
            <Clock size={14} /> {status}
          </span>
        );
    }
  };

  const filteredRecipients = useMemo(() => {
    if (filter === "all") return recipients;
    if (filter === "failed") return recipients.filter((r) => r.status === "failed");
    return recipients.filter((r) => getDerivedStatus(r.status, r.error_message) === filter);
  }, [recipients, filter]);

  // Handle Retry / Resend API
  const handleRetry = async (categoryOption = "all", singleMessageId = null) => {
    try {
      setShowRetryMenu(false);
      if (singleMessageId) {
        setRetryingId(singleMessageId);
      } else {
        setRetrying(true);
      }

      const payload = {};
      if (singleMessageId) {
        payload.message_id = singleMessageId;
      } else if (categoryOption) {
        payload.category = categoryOption;
      }

      const res = await api.post(`/api/campaigns/${id}/retry`, payload);
      if (res.data?.success) {
        showSuccess(res.data.message || `Successfully retried recipients.`);
        await fetchData();
      } else {
        showError(res.data?.error || "Failed to retry campaign recipients.");
      }
    } catch (err) {
      console.error("Retry failed:", err);
      showError(err.response?.data?.error || "Error retrying campaign messages.");
    } finally {
      setRetrying(false);
      setRetryingId(null);
    }
  };

  // Handle Admin Excel Export (.xlsx)
  const handleExportExcel = async () => {
    if (!isAdmin) {
      showError("Excel export is restricted to Administrator accounts only.");
      return;
    }

    try {
      setExporting(true);
      const res = await api.get(`/api/campaigns/${id}/export`, {
        responseType: "blob",
      });

      const blob = new Blob([res.data], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const url = window.URL.createObjectURL(blob);
      const safeTitle = (campaign?.name || "campaign").replace(/[^a-zA-Z0-9_-]/g, "_");
      const a = document.createElement("a");
      a.href = url;
      a.download = `${safeTitle}_analytics_${Date.now()}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      showSuccess("Excel analytics report downloaded successfully!");
    } catch (err) {
      console.error("Failed to export Excel report:", err);
      showError(err.response?.data?.error || "Failed to download Excel report.");
    } finally {
      setExporting(false);
    }
  };

  const analyticsData = useMemo(() => {
    if (!campaign || !recipients.length) return null;

    const errorCategories = {
      "not-on-whatsapp": { label: "Not on WhatsApp", count: 0, sample: "Recipient phone number is not registered on WhatsApp.", color: "#ef4444" },
      "spam-filtered": { label: "Spam / Ecosystem Filtered", count: 0, sample: "Filtered by Meta customer frequency caps or spam protection.", color: "#dc2626" },
      "rate-limit": { label: "Cloud API Rate Limit", count: 0, sample: "Meta messaging tier or Cloud API throughput limit exceeded.", color: "#d97706" },
      "template-mismatch": { label: "Template Parameter Issue", count: 0, sample: "Header media or body parameter variables did not match template format.", color: "#b45309" },
      "other-failed": { label: "Other Dispatch Failures", count: 0, sample: "Meta rejected the message during API dispatch.", color: "#6b7280" },
    };

    recipients.forEach((r) => {
      if (r.status === "failed") {
        const derived = getDerivedStatus(r.status, r.error_message);
        if (errorCategories[derived]) {
          errorCategories[derived].count++;
          if (r.error_message) errorCategories[derived].sample = r.error_message;
        } else {
          errorCategories["other-failed"].count++;
        }
      }
    });

    const activeErrorCategories = Object.entries(errorCategories)
      .filter(([_, data]) => data.count > 0)
      .map(([key, data]) => ({ key, ...data }));

    let totalReadTime = 0;
    let validReadCount = 0;
    recipients.forEach((r) => {
      if (r.status === "read" && r.timestamp) {
        const readTime = new Date(r.timestamp).getTime();
        const sentTime = new Date(campaign.created_at).getTime();
        if (readTime > sentTime) {
          totalReadTime += readTime - sentTime;
          validReadCount++;
        }
      }
    });

    let avgReadTimeText = "N/A";
    if (validReadCount > 0) {
      const avgMs = totalReadTime / validReadCount;
      const avgMins = Math.round(avgMs / 60000);
      if (avgMins < 60) {
        avgReadTimeText = `${avgMins} mins`;
      } else {
        const hours = (avgMins / 60).toFixed(1);
        avgReadTimeText = `${hours} hrs`;
      }
    }

    return { activeErrorCategories, avgReadTimeText, validReadCount };
  }, [campaign, recipients]);

  if (loading) {
    return (
      <div className="page-container">
        <div className="loading-container">
          <div className="loading-spinner" />
        </div>
      </div>
    );
  }

  if (error || !campaign) {
    return (
      <div className="page-container">
        <div className="window-warning">
          <span className="window-warning-text">{error || "Campaign not found"}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container" style={{ background: "#f5f7f9" }}>
      {/* Page Header */}
      <div className="page-header" style={{ display: "flex", flexDirection: "column", gap: "16px", paddingBottom: 0, borderBottom: "none" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "16px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
            <Link href="/campaigns" className="btn-secondary" style={{ padding: "10px", background: "#fff" }}>
              <ArrowLeft size={20} />
            </Link>
            <div>
              <h1 className="page-title" style={{ margin: 0 }}>{campaign.name}</h1>
              <p style={{ color: "var(--text-muted)", fontSize: "13px", marginTop: "4px" }}>
                Created on {format(new Date(campaign.created_at), "MMM d, yyyy 'at' h:mm a")} • Template: <strong>{campaign.template_name}</strong>
              </p>
            </div>
          </div>

          {/* Action Buttons: Export to Excel (Admin Only) & Resend Failed */}
          <div style={{ display: "flex", alignItems: "center", gap: "10px", position: "relative" }}>
            {isAdmin && (
              <button
                onClick={handleExportExcel}
                disabled={exporting}
                className="btn-secondary"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  background: "#fff",
                  color: "#059669",
                  borderColor: "#10b981",
                  fontWeight: "600",
                  padding: "8px 14px",
                  fontSize: "13px"
                }}
                title="Export all recipient analytics and delivery records to Microsoft Excel (.xlsx)"
              >
                <Download size={15} />
                {exporting ? "Exporting..." : "Export Excel"}
              </button>
            )}

            {failedCount > 0 && (
              <div style={{ position: "relative" }}>
                <button
                  onClick={() => setShowRetryMenu((prev) => !prev)}
                  disabled={retrying}
                  className="btn-primary"
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "6px",
                    background: "#dc2626",
                    borderColor: "#dc2626",
                    fontWeight: "600",
                    padding: "8px 14px",
                    fontSize: "13px"
                  }}
                >
                  <RotateCw size={15} className={retrying ? "animate-spin" : ""} />
                  {retrying ? "Resending..." : `Resend Failed (${failedCount})`}
                  <ChevronDown size={14} />
                </button>

                {showRetryMenu && (
                  <div
                    style={{
                      position: "absolute",
                      right: 0,
                      top: "100%",
                      marginTop: "6px",
                      background: "#fff",
                      border: "1px solid var(--border-color)",
                      borderRadius: "8px",
                      boxShadow: "0 10px 25px rgba(0,0,0,0.1)",
                      minWidth: "260px",
                      zIndex: 100,
                      overflow: "hidden"
                    }}
                  >
                    <div style={{ padding: "8px 12px", background: "#f8fafc", fontSize: "11px", fontWeight: "700", color: "#64748b", textTransform: "uppercase" }}>
                      Resend Options
                    </div>
                    <button
                      onClick={() => handleRetry("all")}
                      style={{
                        width: "100%",
                        padding: "10px 14px",
                        textAlign: "left",
                        background: "none",
                        border: "none",
                        borderBottom: "1px solid #f1f5f9",
                        cursor: "pointer",
                        fontSize: "13px",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center"
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = "#f8fafc")}
                      onMouseLeave={(e) => (e.currentTarget.style.background = "none")}
                    >
                      <span style={{ fontWeight: "600", color: "#111" }}>Resend All Failed</span>
                      <span style={{ background: "#fee2e2", color: "#ef4444", padding: "2px 6px", borderRadius: "10px", fontSize: "11px", fontWeight: "700" }}>{failedCount}</span>
                    </button>

                    {categoryCounts["rate-limit"] > 0 && (
                      <button
                        onClick={() => handleRetry("rate-limit")}
                        style={{
                          width: "100%",
                          padding: "10px 14px",
                          textAlign: "left",
                          background: "none",
                          border: "none",
                          borderBottom: "1px solid #f1f5f9",
                          cursor: "pointer",
                          fontSize: "13px",
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center"
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = "#f8fafc")}
                        onMouseLeave={(e) => (e.currentTarget.style.background = "none")}
                      >
                        <span>Retry Rate Limit / Meta Errors</span>
                        <span style={{ background: "#fef3c7", color: "#d97706", padding: "2px 6px", borderRadius: "10px", fontSize: "11px", fontWeight: "700" }}>{categoryCounts["rate-limit"]}</span>
                      </button>
                    )}

                    {categoryCounts["spam-filtered"] > 0 && (
                      <button
                        onClick={() => handleRetry("spam-filtered")}
                        style={{
                          width: "100%",
                          padding: "10px 14px",
                          textAlign: "left",
                          background: "none",
                          border: "none",
                          borderBottom: "1px solid #f1f5f9",
                          cursor: "pointer",
                          fontSize: "13px",
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center"
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = "#f8fafc")}
                        onMouseLeave={(e) => (e.currentTarget.style.background = "none")}
                      >
                        <span>Retry Spam / Filtered</span>
                        <span style={{ background: "#fee2e2", color: "#dc2626", padding: "2px 6px", borderRadius: "10px", fontSize: "11px", fontWeight: "700" }}>{categoryCounts["spam-filtered"]}</span>
                      </button>
                    )}

                    {categoryCounts["not-on-whatsapp"] > 0 && (
                      <button
                        onClick={() => handleRetry("not-on-whatsapp")}
                        style={{
                          width: "100%",
                          padding: "10px 14px",
                          textAlign: "left",
                          background: "none",
                          border: "none",
                          borderBottom: "1px solid #f1f5f9",
                          cursor: "pointer",
                          fontSize: "13px",
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center"
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = "#f8fafc")}
                        onMouseLeave={(e) => (e.currentTarget.style.background = "none")}
                      >
                        <span>Retry Not on WA Numbers</span>
                        <span style={{ background: "#fee2e2", color: "#ef4444", padding: "2px 6px", borderRadius: "10px", fontSize: "11px", fontWeight: "700" }}>{categoryCounts["not-on-whatsapp"]}</span>
                      </button>
                    )}

                    {filter !== "all" && filter !== "failed" && categoryCounts[filter] > 0 && (
                      <button
                        onClick={() => handleRetry(filter)}
                        style={{
                          width: "100%",
                          padding: "10px 14px",
                          textAlign: "left",
                          background: "#eff6ff",
                          border: "none",
                          cursor: "pointer",
                          fontSize: "13px",
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          color: "#1d4ed8",
                          fontWeight: "600"
                        }}
                      >
                        <span>Retry Current Filtered View</span>
                        <span style={{ background: "#dbeafe", color: "#1d4ed8", padding: "2px 6px", borderRadius: "10px", fontSize: "11px" }}>{categoryCounts[filter]}</span>
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", gap: "24px", borderBottom: "1px solid var(--border-color)", paddingLeft: "12px" }}>
          {["overview", "messages", "analytics"].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                background: "none",
                border: "none",
                padding: "12px 4px",
                fontSize: "14px",
                fontWeight: activeTab === tab ? "600" : "500",
                color: activeTab === tab ? "var(--accent)" : "var(--text-secondary)",
                borderBottom: activeTab === tab ? "2px solid var(--accent)" : "2px solid transparent",
                cursor: "pointer",
                textTransform: "capitalize",
                display: "inline-flex",
                alignItems: "center",
                gap: "6px"
              }}
            >
              {tab}
              {tab === "messages" && failedCount > 0 && (
                <span style={{ background: "#fee2e2", color: "#ef4444", fontSize: "11px", padding: "1px 6px", borderRadius: "10px", fontWeight: "700" }}>
                  {failedCount}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="page-content" style={{ padding: "24px" }}>
        {/* OVERVIEW TAB */}
        {activeTab === "overview" && (
          <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "24px" }}>
            {/* Left Column */}
            <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
              {/* Top Stats Cards */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "16px" }}>
                <div style={{ background: "#fff", padding: "20px", borderRadius: "12px", boxShadow: "0 2px 10px rgba(0,0,0,0.02)" }}>
                  <div style={{ color: "var(--text-secondary)", fontSize: "14px", fontWeight: "500", marginBottom: "8px" }}>Engagement Rate</div>
                  <div style={{ fontSize: "28px", fontWeight: "bold", color: "#111" }}>{engagementRate}%</div>
                  <div style={{ color: "var(--text-muted)", fontSize: "12px", marginTop: "4px" }}>Percentage of messages read</div>
                </div>
                <div style={{ background: "#fff", padding: "20px", borderRadius: "12px", boxShadow: "0 2px 10px rgba(0,0,0,0.02)" }}>
                  <div style={{ color: "var(--text-secondary)", fontSize: "14px", fontWeight: "500", marginBottom: "8px" }}>Delivery Rate</div>
                  <div style={{ fontSize: "28px", fontWeight: "bold", color: "#111" }}>{deliveryRate}%</div>
                  <div style={{ color: "var(--text-muted)", fontSize: "12px", marginTop: "4px" }}>Percentage of messages delivered</div>
                </div>
                <div style={{ background: "#fff", padding: "20px", borderRadius: "12px", boxShadow: "0 2px 10px rgba(0,0,0,0.02)" }}>
                  <div style={{ color: "var(--text-secondary)", fontSize: "14px", fontWeight: "500", marginBottom: "8px" }}>Total Contacts</div>
                  <div style={{ fontSize: "28px", fontWeight: "bold", color: "#111" }}>{totalContacts}</div>
                  <div style={{ color: "var(--text-muted)", fontSize: "12px", marginTop: "4px" }}>All contacts selected for this campaign</div>
                </div>
              </div>

              {/* Status Breakdown */}
              <div style={{ background: "#fff", padding: "24px", borderRadius: "12px", boxShadow: "0 2px 10px rgba(0,0,0,0.02)" }}>
                <h3 style={{ fontSize: "16px", fontWeight: "600", marginBottom: "4px" }}>Status Breakdown</h3>
                <p style={{ fontSize: "13px", color: "var(--text-muted)", marginBottom: "24px" }}>
                  Funnel: Total contacts → Sent → Delivered → Read
                </p>

                <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                  {[
                    { label: "Total Contacts", count: totalContacts, color: "#64748b" },
                    { label: "Sent", count: sentCount, color: "#a855f7" },
                    { label: "Delivered", count: deliveredCount, color: "#22c55e" },
                    { label: "Read", count: readCount, color: "#3b82f6" },
                    { label: "Failed (All)", count: failedCount, color: "#ef4444" },
                  ].map((stat) => (
                    <div key={stat.label}>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px", fontWeight: "500", marginBottom: "6px" }}>
                        <span>{stat.label}</span>
                        <span style={{ color: "var(--text-muted)" }}>
                          {stat.count} <span style={{ marginLeft: "8px" }}>{totalContacts > 0 ? Math.round((stat.count / totalContacts) * 100) : 0}%</span>
                        </span>
                      </div>
                      <div style={{ width: "100%", height: "8px", background: "#f1f5f9", borderRadius: "4px", overflow: "hidden" }}>
                        <div
                          style={{
                            width: `${totalContacts > 0 ? (stat.count / totalContacts) * 100 : 0}%`,
                            height: "100%",
                            background: stat.color,
                            borderRadius: "4px",
                          }}
                        ></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Right Column: Template Preview */}
            <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
              <div style={{ background: "#fff", padding: "24px", borderRadius: "12px", boxShadow: "0 2px 10px rgba(0,0,0,0.02)" }}>
                <h3 style={{ fontSize: "16px", fontWeight: "600", marginBottom: "4px" }}>Message Template</h3>
                <p style={{ fontSize: "13px", color: "var(--text-muted)", marginBottom: "16px" }}>Preview of dispatched template</p>

                <div style={{ background: "#e5ddd5", padding: "16px", borderRadius: "12px", backgroundImage: 'url("https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png")', backgroundSize: "cover" }}>
                  <div style={{ background: "white", padding: "12px", borderRadius: "8px", borderTopLeftRadius: "0", boxShadow: "0 1px 2px rgba(0,0,0,0.1)", fontSize: "14px" }}>
                    {template ? (
                      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                        {header && header.format === "IMAGE" && (
                          campaignMediaUrl ? (
                            <div style={{ width: "100%", background: "#f1f5f9", borderRadius: "8px", overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center" }}>
                              <img src={campaignMediaUrl} alt="Campaign Header" style={{ width: "100%", height: "auto", maxHeight: "320px", objectFit: "contain", display: "block", borderRadius: "8px" }} />
                            </div>
                          ) : (
                            <div style={{ background: "rgba(0,0,0,0.05)", borderRadius: "8px", padding: "12px", display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100px" }}>
                              <span style={{ fontSize: "24px", color: "#aaa" }}>📷</span>
                            </div>
                          )
                        )}
                        {header && header.format === "VIDEO" && (
                          campaignMediaUrl ? (
                            <video src={campaignMediaUrl} controls style={{ width: "100%", maxHeight: "240px", borderRadius: "8px" }} />
                          ) : (
                            <div style={{ background: "rgba(0,0,0,0.05)", borderRadius: "8px", padding: "12px", display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100px" }}>
                              <span style={{ fontSize: "24px", color: "#aaa" }}>🎥</span>
                            </div>
                          )
                        )}
                        {header && header.format === "DOCUMENT" && (
                          <div style={{ background: "rgba(0,0,0,0.05)", borderRadius: "8px", padding: "12px", display: "flex", alignItems: "center", gap: "8px" }}>
                            <span style={{ fontSize: "24px" }}>📄</span>
                            <span style={{ fontSize: "13px", color: "var(--text-primary)" }}>{campaignMediaUrl ? campaignMediaUrl.split("/").pop() : "Document"}</span>
                          </div>
                        )}
                        {header && header.format === "TEXT" && <div style={{ fontWeight: 600, fontSize: "15px" }}>{header.text}</div>}
                        {body && <div style={{ whiteSpace: "pre-wrap", color: "var(--text-primary)" }}>{body.text.replace(/\{\{\d+\}\}/g, "___")}</div>}
                        {footer && <div style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "4px" }}>{footer.text}</div>}
                        {buttonsComp?.buttons && buttonsComp.buttons.length > 0 && (
                          <div style={{ borderTop: "1px solid #f0f2f5", marginTop: "6px", paddingTop: "6px", display: "flex", flexDirection: "column", gap: "4px" }}>
                            {buttonsComp.buttons.map((btn, idx) => (
                              <div key={idx} style={{ padding: "8px 10px", textAlign: "center", color: "#00a884", fontSize: "13px", fontWeight: "500", background: "#f8fafc", borderRadius: "6px" }}>
                                {btn.type === "URL" ? "🔗 " : btn.type === "PHONE_NUMBER" ? "📞 " : "↩️ "}
                                {btn.text}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ) : (
                      <>
                        <div style={{ color: "var(--text-muted)", fontSize: "12px", marginBottom: "8px", borderBottom: "1px solid #eee", paddingBottom: "8px", display: "flex", gap: "6px", alignItems: "center" }}>
                          <Activity size={12} /> This is a preview. The actual message may appear differently.
                        </div>
                        <div style={{ fontWeight: "600", color: "var(--text-secondary)", marginBottom: "8px" }}>Template: {campaign.template_name}</div>
                        <div style={{ color: "var(--text-primary)" }}>The template content was sent dynamically via the Meta Cloud API.</div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* MESSAGES TAB */}
        {activeTab === "messages" && (
          <div className="ui-card" style={{ padding: 0, overflow: "hidden", border: "none", boxShadow: "0 2px 10px rgba(0,0,0,0.02)" }}>
            {/* Header with Title and Dropdown */}
            <div style={{ padding: "16px 24px", borderBottom: "1px solid var(--border-color)", display: "flex", justifyContent: "space-between", alignItems: "center", background: "#fff", flexWrap: "wrap", gap: "12px" }}>
              <div>
                <h3 style={{ fontSize: "16px", fontWeight: "600", margin: 0 }}>Recipient Messages</h3>
                <p style={{ fontSize: "13px", color: "var(--text-muted)", margin: "4px 0 0 0" }}>
                  Showing {filteredRecipients.length} of {totalContacts} recipients
                </p>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
                <Filter size={16} className="text-muted" />
                <select
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                  className="ui-input"
                  style={{ minWidth: "220px", padding: "8px 12px", borderRadius: "6px" }}
                >
                  <option value="all">All Statuses ({totalContacts})</option>
                  <option value="sent">Sent ({categoryCounts.sent})</option>
                  <option value="delivered">Delivered ({categoryCounts.delivered})</option>
                  <option value="read">Read ({categoryCounts.read})</option>
                  <option value="failed">All Failures ({failedCount})</option>
                  {categoryCounts["not-on-whatsapp"] > 0 && (
                    <option value="not-on-whatsapp">❌ Not on WhatsApp ({categoryCounts["not-on-whatsapp"]})</option>
                  )}
                  {categoryCounts["spam-filtered"] > 0 && (
                    <option value="spam-filtered">🚫 Spam / Blocked ({categoryCounts["spam-filtered"]})</option>
                  )}
                  {categoryCounts["rate-limit"] > 0 && (
                    <option value="rate-limit">⚡ Rate Limit / Meta Errors ({categoryCounts["rate-limit"]})</option>
                  )}
                  {categoryCounts["template-mismatch"] > 0 && (
                    <option value="template-mismatch">⚠️ Template Errors ({categoryCounts["template-mismatch"]})</option>
                  )}
                  {categoryCounts["other-failed"] > 0 && (
                    <option value="other-failed">⚠️ Other Failures ({categoryCounts["other-failed"]})</option>
                  )}
                </select>
              </div>
            </div>

            {/* Quick Filter Status Badges Bar */}
            <div style={{ padding: "12px 24px", background: "#f8fafc", borderBottom: "1px solid var(--border-color)", display: "flex", gap: "8px", flexWrap: "wrap", alignItems: "center" }}>
              <span style={{ fontSize: "12px", fontWeight: "600", color: "#64748b", marginRight: "4px" }}>Filter by:</span>

              <button
                onClick={() => setFilter("all")}
                style={{
                  padding: "5px 12px",
                  borderRadius: "20px",
                  fontSize: "12px",
                  fontWeight: filter === "all" ? "700" : "500",
                  background: filter === "all" ? "#1e293b" : "#fff",
                  color: filter === "all" ? "#fff" : "#475569",
                  border: "1px solid var(--border-color)",
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px"
                }}
              >
                All <span>({totalContacts})</span>
              </button>

              <button
                onClick={() => setFilter("read")}
                style={{
                  padding: "5px 12px",
                  borderRadius: "20px",
                  fontSize: "12px",
                  fontWeight: filter === "read" ? "700" : "500",
                  background: filter === "read" ? "#0284c7" : "#fff",
                  color: filter === "read" ? "#fff" : "#0284c7",
                  border: "1px solid #bae6fd",
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px"
                }}
              >
                <CheckCircle2 size={13} /> Read <span>({categoryCounts.read})</span>
              </button>

              <button
                onClick={() => setFilter("delivered")}
                style={{
                  padding: "5px 12px",
                  borderRadius: "20px",
                  fontSize: "12px",
                  fontWeight: filter === "delivered" ? "700" : "500",
                  background: filter === "delivered" ? "#059669" : "#fff",
                  color: filter === "delivered" ? "#fff" : "#059669",
                  border: "1px solid #a7f3d0",
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px"
                }}
              >
                <CheckCircle2 size={13} /> Delivered <span>({categoryCounts.delivered})</span>
              </button>

              {categoryCounts["not-on-whatsapp"] > 0 && (
                <button
                  onClick={() => setFilter("not-on-whatsapp")}
                  style={{
                    padding: "5px 12px",
                    borderRadius: "20px",
                    fontSize: "12px",
                    fontWeight: filter === "not-on-whatsapp" ? "700" : "600",
                    background: filter === "not-on-whatsapp" ? "#ef4444" : "#fef2f2",
                    color: filter === "not-on-whatsapp" ? "#fff" : "#ef4444",
                    border: "1px solid #fecaca",
                    cursor: "pointer",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "6px"
                  }}
                >
                  <XCircle size={13} /> Not on WA <span>({categoryCounts["not-on-whatsapp"]})</span>
                </button>
              )}

              {categoryCounts["spam-filtered"] > 0 && (
                <button
                  onClick={() => setFilter("spam-filtered")}
                  style={{
                    padding: "5px 12px",
                    borderRadius: "20px",
                    fontSize: "12px",
                    fontWeight: filter === "spam-filtered" ? "700" : "600",
                    background: filter === "spam-filtered" ? "#dc2626" : "#fee2e2",
                    color: filter === "spam-filtered" ? "#fff" : "#dc2626",
                    border: "1px solid #fca5a5",
                    cursor: "pointer",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "6px"
                  }}
                >
                  <ShieldAlert size={13} /> Spam <span>({categoryCounts["spam-filtered"]})</span>
                </button>
              )}

              {categoryCounts["rate-limit"] > 0 && (
                <button
                  onClick={() => setFilter("rate-limit")}
                  style={{
                    padding: "5px 12px",
                    borderRadius: "20px",
                    fontSize: "12px",
                    fontWeight: filter === "rate-limit" ? "700" : "600",
                    background: filter === "rate-limit" ? "#d97706" : "#fef3c7",
                    color: filter === "rate-limit" ? "#fff" : "#d97706",
                    border: "1px solid #fde68a",
                    cursor: "pointer",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "6px"
                  }}
                >
                  <Zap size={13} /> Rate Limit <span>({categoryCounts["rate-limit"]})</span>
                </button>
              )}

              {categoryCounts["template-mismatch"] > 0 && (
                <button
                  onClick={() => setFilter("template-mismatch")}
                  style={{
                    padding: "5px 12px",
                    borderRadius: "20px",
                    fontSize: "12px",
                    fontWeight: filter === "template-mismatch" ? "700" : "600",
                    background: filter === "template-mismatch" ? "#b45309" : "#fef3c7",
                    color: filter === "template-mismatch" ? "#fff" : "#b45309",
                    border: "1px solid #fde68a",
                    cursor: "pointer",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "6px"
                  }}
                >
                  <AlertTriangle size={13} /> Template Error <span>({categoryCounts["template-mismatch"]})</span>
                </button>
              )}

              {categoryCounts["other-failed"] > 0 && (
                <button
                  onClick={() => setFilter("other-failed")}
                  style={{
                    padding: "5px 12px",
                    borderRadius: "20px",
                    fontSize: "12px",
                    fontWeight: filter === "other-failed" ? "700" : "600",
                    background: filter === "other-failed" ? "#475569" : "#f1f5f9",
                    color: filter === "other-failed" ? "#fff" : "#475569",
                    border: "1px solid #cbd5e1",
                    cursor: "pointer",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "6px"
                  }}
                >
                  <XCircle size={13} /> Other Failed <span>({categoryCounts["other-failed"]})</span>
                </button>
              )}
            </div>

            {/* Recipients Table */}
            <div className="table-responsive" style={{ maxHeight: "600px", overflowY: "auto", overflowX: "auto", background: "#fff", width: "100%" }}>
              <table style={{ width: "100%", minWidth: "640px", borderCollapse: "collapse", textAlign: "left" }}>
                <thead style={{ background: "var(--bg-tertiary)", position: "sticky", top: 0, zIndex: 1 }}>
                  <tr>
                    <th style={{ padding: "14px 20px", color: "var(--text-secondary)", fontWeight: 600, fontSize: "12px", textTransform: "uppercase" }}>Recipient</th>
                    <th style={{ padding: "14px 20px", color: "var(--text-secondary)", fontWeight: 600, fontSize: "12px", textTransform: "uppercase" }}>Status</th>
                    <th style={{ padding: "14px 20px", color: "var(--text-secondary)", fontWeight: 600, fontSize: "12px", textTransform: "uppercase" }}>Reason / Error</th>
                    <th style={{ padding: "14px 20px", color: "var(--text-secondary)", fontWeight: 600, fontSize: "12px", textTransform: "uppercase" }}>Time</th>
                    <th style={{ padding: "14px 20px", color: "var(--text-secondary)", fontWeight: 600, fontSize: "12px", textTransform: "uppercase", textAlign: "right" }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRecipients.length > 0 ? (
                    filteredRecipients.map((r, i) => {
                      const isFailed = r.status === "failed";
                      const isRowRetrying = retryingId === r.id;

                      return (
                        <tr key={r.id} style={{ borderBottom: i === filteredRecipients.length - 1 ? "none" : "1px solid var(--border-color)" }}>
                          <td style={{ padding: "14px 20px" }}>
                            <div style={{ fontWeight: 600, color: "var(--text-primary)", fontSize: "14px" }}>{r.name || "Unknown Contact"}</div>
                            <div style={{ color: "var(--text-muted)", fontSize: "12px", marginTop: "2px" }}>+{r.phone_number}</div>
                          </td>
                          <td style={{ padding: "14px 20px", fontSize: "13px" }}>
                            {getStatusBadge(r.status, r.error_message)}
                          </td>
                          <td style={{ padding: "14px 20px", color: isFailed ? "#dc2626" : "var(--text-muted)", fontSize: "12px", maxWidth: "260px" }}>
                            {r.error_message || (isFailed ? "Meta dispatch failure" : "—")}
                          </td>
                          <td style={{ padding: "14px 20px", color: "var(--text-muted)", fontSize: "13px" }}>
                            {format(new Date(r.timestamp), "MMM d, h:mm a")}
                          </td>
                          <td style={{ padding: "14px 20px", textAlign: "right" }}>
                            {isFailed && (
                              <button
                                onClick={() => handleRetry(null, r.id)}
                                disabled={isRowRetrying || retrying}
                                className="btn-secondary"
                                style={{
                                  padding: "5px 10px",
                                  fontSize: "12px",
                                  fontWeight: "600",
                                  color: "#dc2626",
                                  borderColor: "#fca5a5",
                                  background: "#fef2f2",
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: "4px"
                                }}
                                title="Resend template message to this recipient"
                              >
                                <RotateCw size={12} className={isRowRetrying ? "animate-spin" : ""} />
                                {isRowRetrying ? "Retrying..." : "Retry"}
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan="5" style={{ padding: "48px", textAlign: "center", color: "var(--text-muted)" }}>
                        No recipients match this filter.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ANALYTICS TAB */}
        {activeTab === "analytics" && analyticsData && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "24px" }}>
            {/* Left Column: Key Metrics & Funnel */}
            <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
              <div style={{ background: "#fff", padding: "24px", borderRadius: "12px", boxShadow: "0 2px 10px rgba(0,0,0,0.02)" }}>
                <h3 style={{ fontSize: "16px", fontWeight: "600", marginBottom: "16px" }}>Performance Insights</h3>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: "16px" }}>
                  <div style={{ padding: "16px", background: "#f8fafc", borderRadius: "8px" }}>
                    <div style={{ color: "var(--text-secondary)", fontSize: "13px", fontWeight: "500", marginBottom: "4px" }}>Average Time to Read</div>
                    <div style={{ fontSize: "24px", fontWeight: "bold", color: "var(--accent)" }}>{analyticsData.avgReadTimeText}</div>
                    <div style={{ color: "var(--text-muted)", fontSize: "12px", marginTop: "4px" }}>Based on {analyticsData.validReadCount} read receipts</div>
                  </div>
                  <div style={{ padding: "16px", background: "#f8fafc", borderRadius: "8px" }}>
                    <div style={{ color: "var(--text-secondary)", fontSize: "13px", fontWeight: "500", marginBottom: "4px" }}>Failure Rate</div>
                    <div style={{ fontSize: "24px", fontWeight: "bold", color: "var(--status-failed)" }}>
                      {totalContacts > 0 ? ((failedCount / totalContacts) * 100).toFixed(1) : "0.0"}%
                    </div>
                    <div style={{ color: "var(--text-muted)", fontSize: "12px", marginTop: "4px" }}>{failedCount} undelivered of {totalContacts} total</div>
                  </div>
                </div>
              </div>

              <div style={{ background: "#fff", padding: "24px", borderRadius: "12px", boxShadow: "0 2px 10px rgba(0,0,0,0.02)" }}>
                <h3 style={{ fontSize: "16px", fontWeight: "600", marginBottom: "16px" }}>Engagement Funnel</h3>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", minHeight: "160px", padding: "12px 20px 0" }}>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "8px", width: "60px" }}>
                    <div style={{ color: "var(--text-secondary)", fontSize: "14px", fontWeight: "bold" }}>{totalContacts}</div>
                    <div style={{ width: "100%", height: "100px", background: "#64748b", borderRadius: "4px 4px 0 0" }}></div>
                    <div style={{ fontSize: "12px", color: "var(--text-muted)" }}>Targeted</div>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "8px", width: "60px" }}>
                    <div style={{ color: "var(--text-secondary)", fontSize: "14px", fontWeight: "bold" }}>{sentCount}</div>
                    <div style={{ width: "100%", height: `${totalContacts > 0 ? Math.max((sentCount / totalContacts) * 100, sentCount > 0 ? 4 : 0) : 0}px`, background: "#a855f7", borderRadius: "4px 4px 0 0" }}></div>
                    <div style={{ fontSize: "12px", color: "var(--text-muted)" }}>Sent</div>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "8px", width: "60px" }}>
                    <div style={{ color: "var(--text-secondary)", fontSize: "14px", fontWeight: "bold" }}>{deliveredCount}</div>
                    <div style={{ width: "100%", height: `${totalContacts > 0 ? Math.max((deliveredCount / totalContacts) * 100, deliveredCount > 0 ? 4 : 0) : 0}px`, background: "#22c55e", borderRadius: "4px 4px 0 0" }}></div>
                    <div style={{ fontSize: "12px", color: "var(--text-muted)" }}>Delivered</div>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "8px", width: "60px" }}>
                    <div style={{ color: "var(--text-secondary)", fontSize: "14px", fontWeight: "bold" }}>{readCount}</div>
                    <div style={{ width: "100%", height: `${totalContacts > 0 ? Math.max((readCount / totalContacts) * 100, readCount > 0 ? 4 : 0) : 0}px`, background: "#3b82f6", borderRadius: "4px 4px 0 0" }}></div>
                    <div style={{ fontSize: "12px", color: "var(--text-muted)" }}>Read</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column: Error Breakdown by Category with Quick Resend */}
            <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
              <div style={{ background: "#fff", padding: "24px", borderRadius: "12px", boxShadow: "0 2px 10px rgba(0,0,0,0.02)", height: "100%" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
                  <h3 style={{ fontSize: "16px", fontWeight: "600", margin: 0 }}>Categorized Error Analysis</h3>
                  {failedCount > 0 && (
                    <span style={{ background: "#fee2e2", color: "#dc2626", fontSize: "12px", fontWeight: "700", padding: "2px 8px", borderRadius: "10px" }}>
                      {failedCount} Total Failures
                    </span>
                  )}
                </div>
                <p style={{ fontSize: "13px", color: "var(--text-muted)", marginBottom: "16px" }}>
                  Delivery failures categorized by Meta Cloud API error codes
                </p>

                {analyticsData.activeErrorCategories.length > 0 ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                    {analyticsData.activeErrorCategories.map((item) => (
                      <div key={item.key} style={{ padding: "14px", border: "1px solid var(--border-color)", borderRadius: "8px", background: "#f8fafc" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "6px" }}>
                          <span style={{ fontWeight: "700", color: item.color, fontSize: "14px" }}>
                            {item.label} ({item.count})
                          </span>
                          <span style={{ fontSize: "12px", color: "var(--text-muted)", background: "#fff", padding: "2px 8px", borderRadius: "12px", border: "1px solid var(--border-color)", fontWeight: "600" }}>
                            {Math.round((item.count / failedCount) * 100)}% of failures
                          </span>
                        </div>
                        <div style={{ color: "var(--text-secondary)", fontSize: "13px", lineHeight: "1.4", marginBottom: "10px" }}>
                          {item.sample}
                        </div>
                        <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
                          <button
                            onClick={() => {
                              setFilter(item.key);
                              setActiveTab("messages");
                            }}
                            className="btn-secondary"
                            style={{ padding: "4px 10px", fontSize: "12px", background: "#fff" }}
                          >
                            View Recipients ({item.count})
                          </button>
                          <button
                            onClick={() => handleRetry(item.key)}
                            disabled={retrying}
                            className="btn-primary"
                            style={{ padding: "4px 10px", fontSize: "12px", background: item.color, borderColor: item.color }}
                          >
                            <RotateCw size={12} className={retrying ? "animate-spin" : ""} style={{ marginRight: "4px" }} />
                            Resend Category
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "40px 0", color: "var(--text-muted)" }}>
                    <CheckCircle2 size={32} color="#22c55e" style={{ opacity: 0.5, marginBottom: "12px" }} />
                    <p style={{ fontSize: "14px", fontWeight: "500" }}>No delivery failures</p>
                    <p style={{ fontSize: "13px" }}>All messages were processed successfully via the Meta API.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
