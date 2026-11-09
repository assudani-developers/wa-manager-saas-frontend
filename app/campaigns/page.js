"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Plus, Megaphone, Trash2, Zap, Filter } from "lucide-react";
import api, { getCampaigns, deleteCampaign } from "../lib/api";
import { getSocket } from "../lib/socket";
import { format } from "date-fns";
import { useToast } from "../components/ToastProvider";

export default function CampaignsPage() {
  const { showSuccess, showError } = useToast();
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [liveEvent, setLiveEvent] = useState(null);

  // Master Admin client filtering
  const [isMasterAdmin, setIsMasterAdmin] = useState(false);
  const [adminClients, setAdminClients] = useState([]);
  const [selectedClientId, setSelectedClientId] = useState("all");

  useEffect(() => {
    try {
      const role = localStorage.getItem("user_role");
      const userStr = localStorage.getItem("user");
      const user = userStr ? JSON.parse(userStr) : null;
      const isMaster =
        role === "master_admin" ||
        user?.role === "master_admin" ||
        user?.username?.toLowerCase() === "piyushassudani";
      setIsMasterAdmin(isMaster);
      if (isMaster) {
        api
          .get("/api/billing/admin/clients")
          .then((res) => setAdminClients(res.data?.clients || []))
          .catch(() => {});
      }
    } catch (e) {}
  }, []);

  const fetchCampaigns = async (isSilent = false) => {
    try {
      if (!isSilent) setLoading(true);
      const params = {};
      if (selectedClientId && selectedClientId !== "all") {
        params.client_id = selectedClientId;
      }
      const res = await api.get("/api/campaigns", { params });
      setCampaigns(res.data || []);
    } catch (err) {
      console.error("Failed to fetch campaigns:", err);
    } finally {
      if (!isSilent) setLoading(false);
    }
  };

  useEffect(() => {
    fetchCampaigns(false);
  }, [selectedClientId]);

  // Real-time socket updates for campaigns list
  useEffect(() => {
    const socket = getSocket();

    const handleCampaignProgress = (data) => {
      if (data?.campaignId) {
        setCampaigns((prev) =>
          prev.map((c) => {
            if (String(c.id) === String(data.campaignId)) {
              const newSent = data.success ? (c.total_sent || 0) + 1 : (c.total_sent || 0);
              const newFailed = !data.success ? (c.total_failed || 0) + 1 : (c.total_failed || 0);
              return {
                ...c,
                total_sent: newSent,
                total_failed: newFailed,
              };
            }
            return c;
          })
        );
        setLiveEvent(`Campaign dispatch active: Processed ${data.phone || "recipient"}`);
        setTimeout(() => setLiveEvent(null), 3500);
      }
      fetchCampaigns(true);
    };

    const handleMessageStatus = (data) => {
      fetchCampaigns(true);
    };

    socket.on("campaign_progress", handleCampaignProgress);
    socket.on("message_status", handleMessageStatus);

    return () => {
      socket.off("campaign_progress", handleCampaignProgress);
      socket.off("message_status", handleMessageStatus);
    };
  }, [selectedClientId]);

  const handleDelete = async (id) => {
    if (!confirm("Are you sure you want to delete this campaign?")) return;
    try {
      await deleteCampaign(id);
      setCampaigns(campaigns.filter((c) => c.id !== id));
      showSuccess("Campaign deleted successfully.");
    } catch (err) {
      console.error("Failed to delete campaign:", err);
      showError(err.response?.data?.error || "Failed to delete campaign");
    }
  };

  return (
    <div className="page-container">
      <div
        className="page-header"
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "12px",
        }}
      >
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
            <h1 className="page-title" style={{ margin: 0 }}>Campaigns</h1>
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                padding: "3px 10px",
                background: "#ecfdf5",
                border: "1px solid #a7f3d0",
                borderRadius: "20px",
                fontSize: "11px",
                fontWeight: 600,
                color: "#047857",
              }}
            >
              <span
                style={{
                  width: "7px",
                  height: "7px",
                  borderRadius: "50%",
                  background: "#10b981",
                  boxShadow: "0 0 8px #10b981",
                  display: "inline-block",
                }}
              />
              Live Sync Active
            </div>
          </div>
          <p style={{ color: "var(--text-secondary)", fontSize: "14px", marginTop: "4px" }}>
            Manage broadcast campaigns with real-time delivery tracking.
          </p>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
          {/* Master Admin Client-Wise Selector */}
          {isMasterAdmin && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                background: "#fff",
                border: "1px solid #cbd5e1",
                borderRadius: "8px",
                padding: "6px 12px",
                boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
              }}
            >
              <Filter size={15} color="#64748b" />
              <span style={{ fontSize: "12px", fontWeight: 600, color: "#64748b" }}>Client:</span>
              <select
                value={selectedClientId}
                onChange={(e) => setSelectedClientId(e.target.value)}
                style={{
                  border: "none",
                  outline: "none",
                  fontSize: "13px",
                  fontWeight: 600,
                  color: "#0f172a",
                  background: "transparent",
                  cursor: "pointer",
                }}
              >
                <option value="all">🏢 All Clients (Global Overview)</option>
                {adminClients.map((client) => (
                  <option key={client.id} value={client.id}>
                    👤 {client.username}
                  </option>
                ))}
              </select>
            </div>
          )}

          <Link href="/campaigns/new" className="btn-primary">
            <Plus size={18} />
            New Campaign
          </Link>
        </div>
      </div>

      {liveEvent && (
        <div
          style={{
            marginBottom: "16px",
            padding: "8px 14px",
            background: "#eff6ff",
            border: "1px solid #bfdbfe",
            borderRadius: "8px",
            display: "flex",
            alignItems: "center",
            gap: "8px",
            fontSize: "13px",
            color: "#1e40af",
          }}
        >
          <Zap size={15} color="#3b82f6" />
          <span>{liveEvent}</span>
        </div>
      )}

      <div className="page-content">
        {loading && campaigns.length === 0 ? (
          <div className="loading-container">
            <div className="loading-spinner" />
          </div>
        ) : campaigns.length === 0 ? (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              padding: "80px 20px",
              textAlign: "center",
              color: "var(--text-secondary)",
            }}
          >
            <div
              style={{
                width: "72px",
                height: "72px",
                background: "var(--bg-tertiary)",
                borderRadius: "50%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: "16px",
                color: "var(--accent)",
              }}
            >
              <Megaphone size={32} />
            </div>
            <h2
              style={{
                fontSize: "20px",
                fontWeight: "600",
                color: "var(--text-primary)",
                marginBottom: "8px",
              }}
            >
              No campaigns found
            </h2>
            <p style={{ fontSize: "14px", maxWidth: "400px", lineHeight: 1.6 }}>
              {selectedClientId !== "all"
                ? "This client has not created any broadcast campaigns yet."
                : "Create your first campaign by uploading an Excel file with phone numbers and selecting a message template."}
            </p>
            <Link href="/campaigns/new" className="btn-primary" style={{ marginTop: "24px" }}>
              <Plus size={18} />
              Create Campaign
            </Link>
          </div>
        ) : (
          <div className="campaign-grid">
            {campaigns.map((campaign) => (
              <div
                key={campaign.id}
                className="ui-card animate-fade-in"
                style={{ display: "flex", flexDirection: "column" }}
              >
                <div className="ui-card-header">
                  <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                    <h3 className="ui-card-title">{campaign.name}</h3>
                    {isMasterAdmin && (
                      <span
                        style={{
                          fontSize: "11px",
                          padding: "2px 8px",
                          borderRadius: "10px",
                          background: "rgba(59, 130, 246, 0.12)",
                          color: "#2563eb",
                          fontWeight: 700,
                          width: "fit-content",
                        }}
                      >
                        👤 Client: {campaign.client_username || "Direct Admin"}
                      </span>
                    )}
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    {campaign.status === "scheduled" && (
                      <span
                        style={{
                          fontSize: "11px",
                          padding: "2px 8px",
                          borderRadius: "10px",
                          background: "rgba(124, 58, 237, 0.12)",
                          color: "#7c3aed",
                          fontWeight: 700,
                          border: "1px solid rgba(124, 58, 237, 0.25)",
                        }}
                      >
                        📅 Scheduled
                      </span>
                    )}
                    <div className="ui-card-badge">
                      {campaign.created_at ? format(new Date(campaign.created_at), "MMM d, yyyy") : ""}
                    </div>
                    <button
                      onClick={() => handleDelete(campaign.id)}
                      style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)" }}
                      title="Delete Campaign"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>

                <div className="ui-card-subtitle" style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <Megaphone size={16} />
                  Template: <span style={{ fontWeight: 600, color: "var(--text-primary)" }}>{campaign.template_name}</span>
                </div>

                {campaign.status === "scheduled" && campaign.scheduled_at && (
                  <div
                    style={{
                      marginTop: "8px",
                      padding: "6px 10px",
                      background: "rgba(124, 58, 237, 0.08)",
                      borderRadius: "8px",
                      fontSize: "12px",
                      color: "#7c3aed",
                      fontWeight: 600,
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                    }}
                  >
                    <span>⏰ Auto-dispatch at:</span>
                    <span>{format(new Date(campaign.scheduled_at), "MMM d, yyyy 'at' h:mm a")}</span>
                  </div>
                )}

                <div className="campaign-stats" style={{ flex: 1 }}>
                  <div className="campaign-stat">
                    <div className="campaign-stat-value">{campaign.total_sent || 0}</div>
                    <div className="campaign-stat-label">Sent</div>
                  </div>
                  <div className="campaign-stat">
                    <div className="campaign-stat-value">{campaign.total_delivered || 0}</div>
                    <div className="campaign-stat-label delivered">Delivered</div>
                  </div>
                  <div className="campaign-stat">
                    <div className="campaign-stat-value">{campaign.total_read || 0}</div>
                    <div className="campaign-stat-label read">Read</div>
                  </div>
                  <div className="campaign-stat">
                    <div className="campaign-stat-value">{campaign.total_failed || 0}</div>
                    <div className="campaign-stat-label failed">Failed</div>
                  </div>
                </div>

                <div
                  style={{
                    marginTop: "20px",
                    paddingTop: "16px",
                    borderTop: "1px solid var(--border-color)",
                    textAlign: "center",
                  }}
                >
                  <Link
                    href={`/campaigns/${campaign.id}`}
                    style={{
                      color: "var(--accent)",
                      fontWeight: 600,
                      fontSize: "14px",
                      textDecoration: "none",
                      display: "inline-block",
                      width: "100%",
                    }}
                  >
                    View Recipients →
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
