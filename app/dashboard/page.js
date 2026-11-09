"use client";

import { useState, useEffect, useRef } from "react";
import {
  Users,
  Megaphone,
  Send,
  Mail,
  Briefcase,
  FileText,
  CheckCircle,
  BarChart2,
  ArrowRight,
  Zap,
  Radio,
} from "lucide-react";
import { format } from "date-fns";
import api from "../lib/api";
import { getSocket } from "../lib/socket";
import Link from "next/link";

export default function DashboardPage() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [inboundReplies, setInboundReplies] = useState([]);
  const [inboundLoading, setInboundLoading] = useState(true);

  // Live real-time notification & pulse state
  const [liveEventNotice, setLiveEventNotice] = useState(null);
  const [isPulsing, setIsPulsing] = useState(false);
  const noticeTimerRef = useRef(null);

  // Set default to current month
  const today = new Date();
  const firstDay = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split("T")[0];
  const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().split("T")[0];

  const [startDate, setStartDate] = useState(firstDay);
  const [endDate, setEndDate] = useState(lastDay);

  const triggerLiveNotice = (text, type = "event") => {
    setIsPulsing(true);
    setLiveEventNotice({
      text,
      type,
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
    });

    if (noticeTimerRef.current) clearTimeout(noticeTimerRef.current);
    noticeTimerRef.current = setTimeout(() => {
      setIsPulsing(false);
      setLiveEventNotice(null);
    }, 4500);
  };

  const fetchDashboard = (isSilent = false) => {
    if (!isSilent) setLoading(true);
    api
      .get("/api/dashboard", {
        params: {
          startDate,
          endDate,
          nocache: isSilent ? "1" : undefined,
        },
      })
      .then((res) => {
        setStats(res.data);
      })
      .catch((err) => {
        console.error("Dashboard fetch error:", err);
      })
      .finally(() => {
        if (!isSilent) setLoading(false);
      });
  };

  const fetchInbound = () => {
    api
      .get("/api/messages/inbound")
      .then((res) => {
        setInboundReplies(Array.isArray(res.data) ? res.data.slice(0, 5) : []);
      })
      .catch((err) => {
        console.error("Failed to fetch inbound replies for dashboard:", err);
      })
      .finally(() => {
        setInboundLoading(false);
      });
  };

  useEffect(() => {
    fetchDashboard(false);
    fetchInbound();
  }, [startDate, endDate]);

  // Real-time socket updates for live dashboard analytics & recent inbound inquiries
  useEffect(() => {
    const socket = getSocket();

    const handleNewMessage = (msg) => {
      // Multi-tenant Scoping: Do NOT show incoming messages/callbacks from contacts of other clients!
      try {
        const userStr = typeof window !== "undefined" ? localStorage.getItem("user") : null;
        const role = typeof window !== "undefined" ? localStorage.getItem("user_role") : null;
        const user = userStr ? JSON.parse(userStr) : null;
        const currentUserId = user?.id;
        const activeClientId = typeof window !== "undefined" ? localStorage.getItem("active_client_id") : null;
        const isMaster = (role === "master_admin" || user?.role === "master_admin" || user?.username?.toLowerCase() === "piyushassudani") && !activeClientId;

        if (!isMaster && msg.contact_user_id && currentUserId && msg.contact_user_id !== currentUserId) {
          return; // Ignore messages belonging to other clients
        }
      } catch (e) {}

      const isOutbound = msg.direction === "outbound";
      const target = msg.contact_name || msg.contact_phone || "Customer";

      // 1. Optimistic instant increment
      setStats((prev) => {
        if (!prev) return prev;
        const newSent = isOutbound ? (prev.totalMessagesSent || 0) + 1 : prev.totalMessagesSent;
        const newReceived = !isOutbound ? (prev.totalMessagesReceived || 0) + 1 : prev.totalMessagesReceived;
        const newCampSent = isOutbound ? (prev.campaignStatus?.sent || 0) + 1 : (prev.campaignStatus?.sent || 0);
        return {
          ...prev,
          totalMessagesSent: newSent,
          totalMessagesReceived: newReceived,
          campaignStatus: {
            ...prev.campaignStatus,
            sent: newCampSent,
          },
        };
      });

      // 2. Prepend inbound reply preview
      if (!isOutbound) {
        setInboundReplies((prev) => [
          {
            id: msg.id || Date.now(),
            contact_id: msg.contact_id,
            name: msg.contact_name,
            phone_number: msg.contact_phone,
            message_body: msg.message_body,
            timestamp: msg.timestamp || new Date().toISOString(),
          },
          ...prev.slice(0, 4),
        ]);
      }

      // 3. Trigger live banner
      triggerLiveNotice(
        isOutbound
          ? `Outbound message dispatched to ${target}`
          : `Inbound customer inquiry received from ${target}`,
        isOutbound ? "outbound" : "inbound"
      );

      // 4. Silent background re-sync
      fetchDashboard(true);
    };

    const handleMessageStatus = (data) => {
      const status = data?.status;
      if (status) {
        setStats((prev) => {
          if (!prev) return prev;
          let newDelivered = prev.campaignStatus?.delivered || 0;
          let newRead = prev.campaignStatus?.read || 0;
          let newFailed = prev.campaignStatus?.failed || 0;

          if (status === "delivered") newDelivered += 1;
          else if (status === "read") newRead += 1;
          else if (status === "failed") newFailed += 1;

          const totalSent = prev.totalMessagesSent || 1;
          const newRate = (((newDelivered + newRead) / totalSent) * 100).toFixed(1);

          return {
            ...prev,
            deliveryRate: newRate,
            campaignStatus: {
              ...prev.campaignStatus,
              delivered: newDelivered,
              read: newRead,
              failed: newFailed,
            },
          };
        });

        triggerLiveNotice(
          `Message delivery confirmed: ${status.toUpperCase()} (${data.recipient || "WhatsApp Cloud"})`,
          "status"
        );
      }

      fetchDashboard(true);
    };

    const handleCampaignProgress = (data) => {
      triggerLiveNotice(
        `Campaign broadcast running: ${data?.phone ? `Processed ${data.phone}` : "Live dispatch"}`,
        "campaign"
      );
      fetchDashboard(true);
    };

    socket.on("new_message", handleNewMessage);
    socket.on("message_status", handleMessageStatus);
    socket.on("campaign_progress", handleCampaignProgress);

    return () => {
      socket.off("new_message", handleNewMessage);
      socket.off("message_status", handleMessageStatus);
      socket.off("campaign_progress", handleCampaignProgress);
      if (noticeTimerRef.current) clearTimeout(noticeTimerRef.current);
    };
  }, [startDate, endDate]);

  if (loading && !stats) {
    return (
      <div className="page-container">
        <div className="loading-container">
          <div className="loading-spinner" />
        </div>
      </div>
    );
  }

  const {
    totalLeads = 0,
    totalLists = 0,
    totalCampaigns = 0,
    totalMessagesSent = 0,
    totalMessagesReceived = 0,
    deliveryRate = "0.0",
    campaignStatus = { sent: 0, delivered: 0, read: 0, failed: 0 },
  } = stats || {};

  const totalInteractions = totalMessagesSent + totalMessagesReceived;
  const deliveryRateValue = parseFloat(deliveryRate);

  const totalSent = totalMessagesSent || 0;
  const sentCount = campaignStatus.sent || 0;
  const deliveredCount = campaignStatus.delivered || 0;
  const readCount = campaignStatus.read || 0;
  const failedCount = campaignStatus.failed || 0;

  const deliveredPct = totalSent > 0 ? Math.min(100, Math.round((deliveredCount / totalSent) * 100)) : 0;
  const readPct = totalSent > 0 ? Math.min(100, Math.round((readCount / totalSent) * 100)) : 0;

  const totalTracked = sentCount + deliveredCount + failedCount;
  let donutBackground = "#f1f5f9";
  if (totalTracked > 0) {
    const sPct = (sentCount / totalTracked) * 100;
    const dPct = (deliveredCount / totalTracked) * 100;
    donutBackground = `conic-gradient(#3b82f6 0% ${sPct}%, #10b981 ${sPct}% ${sPct + dPct}%, #f59e0b ${sPct + dPct}% 100%)`;
  }

  return (
    <div className="page-container" style={{ background: "#f5f7f9", padding: "24px" }}>
      {/* Page Header with Real-Time Engine Pill */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "18px",
          flexWrap: "wrap",
          gap: "16px",
        }}
      >
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
            <h1 style={{ fontSize: "24px", fontWeight: "bold", color: "#111", margin: 0 }}>
              Welcome back! 👋
            </h1>
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
              Live Engine Connected
            </div>
          </div>
          <p style={{ color: "var(--text-secondary)", fontSize: "14px", marginTop: "4px" }}>
            Real-time analytics and live messaging performance.
          </p>
        </div>

        <div style={{ display: "flex", gap: "12px", alignItems: "center", flexWrap: "wrap" }}>
          <div
            style={{
              background: "#fff",
              border: "1px solid #e2e8f0",
              borderRadius: "6px",
              padding: "4px 12px",
              display: "flex",
              alignItems: "center",
              gap: "8px",
              flexWrap: "wrap",
            }}
          >
            <span role="img" aria-label="calendar">
              📅
            </span>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              style={{ border: "none", outline: "none", background: "transparent", fontSize: "13px", color: "#333" }}
            />
            <span style={{ color: "#94a3b8" }}>-</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              style={{ border: "none", outline: "none", background: "transparent", fontSize: "13px", color: "#333" }}
            />
          </div>
          <Link
            href="/campaigns/new"
            className="btn-primary"
            style={{
              background: "#3b82f6",
              color: "#fff",
              border: "none",
              display: "flex",
              alignItems: "center",
              gap: "8px",
              padding: "8px 16px",
              borderRadius: "6px",
              fontWeight: 500,
              textDecoration: "none",
            }}
          >
            + Quick Create
          </Link>
        </div>
      </div>

      {/* Live Activity Ticker Banner */}
      {liveEventNotice && (
        <div
          style={{
            marginBottom: "20px",
            padding: "10px 16px",
            background: "#eff6ff",
            border: "1px solid #bfdbfe",
            borderRadius: "10px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            fontSize: "13px",
            color: "#1e40af",
            animation: "fadeIn 0.3s ease",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <Zap size={16} color="#3b82f6" />
            <span>
              <strong>Real-Time Update:</strong> {liveEventNotice.text}
            </span>
          </div>
          <span style={{ fontSize: "11px", color: "#60a5fa", fontWeight: 500 }}>
            {liveEventNotice.time}
          </span>
        </div>
      )}

      {/* Top Cards Row 1 */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: "16px",
          marginBottom: "20px",
        }}
      >
        {[
          {
            label: "TOTAL CONTACTS",
            value: totalLeads.toLocaleString(),
            sub: "All Time",
            icon: <Users size={20} color="#3b82f6" />,
            bg: "#eff6ff",
          },
          {
            label: "CONTACT LISTS",
            value: totalLists.toLocaleString(),
            sub: "All Time",
            icon: <Briefcase size={20} color="#8b5cf6" />,
            bg: "#f3e8ff",
          },
          {
            label: "TOTAL INTERACTIONS",
            value: totalInteractions.toLocaleString(),
            sub: "This Month",
            icon: <FileText size={20} color="#0f766e" />,
            bg: "#ccfbf1",
          },
          {
            label: "AVG DELIVERY",
            value: deliveryRate + "%",
            sub: "Live Synced",
            icon: <BarChart2 size={20} color="#16a34a" />,
            bg: "#dcfce7",
          },
        ].map((card, i) => (
          <div
            key={i}
            style={{
              background: "#fff",
              padding: "24px",
              borderRadius: "12px",
              boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
              display: "flex",
              flexDirection: "column",
              position: "relative",
              overflow: "hidden",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "16px" }}>
              <div style={{ fontSize: "12px", fontWeight: "600", color: "#64748b", letterSpacing: "0.5px" }}>
                {card.label}
              </div>
              <div style={{ fontSize: "12px", color: "#94a3b8", display: "flex", alignItems: "center", gap: "4px" }}>
                {card.sub}
              </div>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
              <div style={{ fontSize: "32px", fontWeight: "bold", color: "#0f172a" }}>{card.value}</div>
              <div
                style={{
                  width: "48px",
                  height: "48px",
                  borderRadius: "12px",
                  background: card.bg,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {card.icon}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Top Cards Row 2 (With Live Pulse Highlighting) */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: "20px",
          marginBottom: "20px",
        }}
      >
        {[
          {
            label: "CAMPAIGNS",
            value: totalCampaigns.toLocaleString(),
            sub: "Total Active",
            icon: <Megaphone size={20} color="#a855f7" />,
            bg: "#f3e8ff",
          },
          {
            label: "MESSAGES SENT",
            value: totalMessagesSent.toLocaleString(),
            sub: "All Time (Live)",
            icon: <Send size={20} color="#10b981" />,
            bg: "#d1fae5",
            highlight: isPulsing,
          },
          {
            label: "MESSAGES RECEIVED",
            value: totalMessagesReceived.toLocaleString(),
            sub: "Inbound Replies",
            icon: <Mail size={20} color="#3b82f6" />,
            bg: "#eff6ff",
            highlight: isPulsing,
          },
          {
            label: "DELIVERY RATE",
            value: deliveryRate + "%",
            sub: "Real-time",
            icon: <CheckCircle size={20} color={deliveryRateValue < 90 ? "#ef4444" : "#f59e0b"} />,
            bg: "#fef3c7",
          },
        ].map((card, i) => (
          <div
            key={i}
            style={{
              background: "#fff",
              padding: "24px",
              borderRadius: "12px",
              boxShadow: card.highlight
                ? "0 0 0 2px #10b981, 0 4px 12px rgba(16, 185, 129, 0.15)"
                : "0 1px 3px rgba(0,0,0,0.05)",
              display: "flex",
              flexDirection: "column",
              transition: "box-shadow 0.3s ease",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "16px" }}>
              <div style={{ fontSize: "12px", fontWeight: "600", color: "#64748b", letterSpacing: "0.5px" }}>
                {card.label}
              </div>
              <div style={{ fontSize: "12px", color: card.highlight ? "#059669" : "#94a3b8", display: "flex", alignItems: "center", gap: "4px", fontWeight: card.highlight ? 600 : 400 }}>
                {card.sub}
              </div>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
              <div style={{ fontSize: "32px", fontWeight: "bold", color: "#0f172a" }}>{card.value}</div>
              <div
                style={{
                  width: "48px",
                  height: "48px",
                  borderRadius: "12px",
                  background: card.bg,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {card.icon}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Charts & Delivery Breakdown Section */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "20px" }}>
        {/* Real Message Delivery Funnel */}
        <div style={{ background: "#fff", padding: "24px", borderRadius: "12px", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
            <h3 style={{ fontSize: "15px", fontWeight: "600", color: "#333", margin: 0 }}>Message Delivery Funnel</h3>
            <span style={{ fontSize: "11px", color: "#10b981", fontWeight: 600, display: "flex", alignItems: "center", gap: "4px" }}>
              <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#10b981" }} />
              Live Funnel
            </span>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "13px", color: "#64748b", marginBottom: "6px" }}>
                <span>Sent</span>
                <span style={{ fontWeight: "600", color: "#0f172a" }}>
                  {sentCount.toLocaleString()} {totalSent > 0 ? "(100%)" : ""}
                </span>
              </div>
              <div style={{ width: "100%", height: "12px", background: "#f1f5f9", borderRadius: "6px", overflow: "hidden" }}>
                <div style={{ width: totalSent > 0 ? "100%" : "0%", height: "100%", background: "#3b82f6", borderRadius: "6px", transition: "width 0.6s ease" }} />
              </div>
            </div>

            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "13px", color: "#64748b", marginBottom: "6px" }}>
                <span>Delivered</span>
                <span style={{ fontWeight: "600", color: "#0f172a" }}>
                  {deliveredCount.toLocaleString()} {totalSent > 0 ? `(${deliveredPct}%)` : ""}
                </span>
              </div>
              <div style={{ width: "100%", height: "12px", background: "#f1f5f9", borderRadius: "6px", overflow: "hidden" }}>
                <div style={{ width: totalSent > 0 ? `${deliveredPct}%` : "0%", height: "100%", background: "#8b5cf6", borderRadius: "6px", transition: "width 0.6s ease" }} />
              </div>
            </div>

            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "13px", color: "#64748b", marginBottom: "6px" }}>
                <span>Read</span>
                <span style={{ fontWeight: "600", color: "#0f172a" }}>
                  {readCount.toLocaleString()} {totalSent > 0 ? `(${readPct}%)` : ""}
                </span>
              </div>
              <div style={{ width: "100%", height: "12px", background: "#f1f5f9", borderRadius: "6px", overflow: "hidden" }}>
                <div style={{ width: totalSent > 0 ? `${readPct}%` : "0%", height: "100%", background: "#10b981", borderRadius: "6px", transition: "width 0.6s ease" }} />
              </div>
            </div>
          </div>
        </div>

        {/* Real Message Status Donut Chart */}
        <div style={{ background: "#fff", padding: "24px", borderRadius: "12px", boxShadow: "0 1px 3px rgba(0,0,0,0.05)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
          <h3 style={{ fontSize: "15px", fontWeight: "600", color: "#333", marginBottom: "24px", alignSelf: "flex-start" }}>
            Message Status Breakdown
          </h3>

          <div
            style={{
              width: "150px",
              height: "150px",
              borderRadius: "50%",
              background: donutBackground,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              position: "relative",
              boxShadow: "inset 0 0 0 1px rgba(0,0,0,0.05)",
              transition: "background 0.5s ease",
            }}
          >
            <div
              style={{
                width: "90px",
                height: "90px",
                borderRadius: "50%",
                background: "#fff",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0 2px 4px rgba(0,0,0,0.05)",
              }}
            >
              <div style={{ fontSize: "20px", fontWeight: "bold", color: "#0f172a" }}>{totalSent.toLocaleString()}</div>
              <div style={{ fontSize: "11px", color: "#64748b" }}>Tracked</div>
            </div>
          </div>

          <div style={{ display: "flex", gap: "16px", marginTop: "24px", flexWrap: "wrap", justifyContent: "center" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12px", color: "#64748b" }}>
              <div style={{ width: "10px", height: "10px", borderRadius: "50%", background: "#3b82f6" }} />
              Sent ({sentCount})
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12px", color: "#64748b" }}>
              <div style={{ width: "10px", height: "10px", borderRadius: "50%", background: "#10b981" }} />
              Delivered ({deliveredCount})
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12px", color: "#64748b" }}>
              <div style={{ width: "10px", height: "10px", borderRadius: "50%", background: "#f59e0b" }} />
              Failed ({failedCount})
            </div>
          </div>
        </div>

        {/* Live Inbound Customer Replies */}
        <div style={{ background: "#fff", padding: "24px", borderRadius: "12px", boxShadow: "0 1px 3px rgba(0,0,0,0.05)", display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
            <h3 style={{ fontSize: "15px", fontWeight: "600", color: "#333", margin: 0 }}>Recent Inbound Replies</h3>
            <Link
              href="/chat"
              style={{ fontSize: "12px", color: "#3b82f6", textDecoration: "none", display: "flex", alignItems: "center", gap: "4px", fontWeight: 600 }}
            >
              Open Chat <ArrowRight size={14} />
            </Link>
          </div>

          {inboundLoading ? (
            <div style={{ padding: "40px", textAlign: "center", color: "#94a3b8", fontSize: "13px" }}>
              Loading recent replies...
            </div>
          ) : inboundReplies.length === 0 ? (
            <div style={{ padding: "40px 20px", textAlign: "center", color: "#94a3b8", fontSize: "13px" }}>
              No inbound customer replies yet.
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "10px", flex: 1 }}>
              {inboundReplies.map((reply) => (
                <Link
                  key={reply.id}
                  href={`/chat?contactId=${reply.contact_id}`}
                  style={{
                    textDecoration: "none",
                    padding: "10px 12px",
                    background: "#f8fafc",
                    borderRadius: "8px",
                    border: "1px solid #f1f5f9",
                    display: "flex",
                    flexDirection: "column",
                    gap: "4px",
                    transition: "background 0.2s ease",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: "13px", fontWeight: 600, color: "#0f172a" }}>
                      {reply.name || reply.phone_number}
                    </span>
                    <span style={{ fontSize: "11px", color: "#94a3b8" }}>
                      {reply.timestamp ? format(new Date(reply.timestamp), "h:mm a") : ""}
                    </span>
                  </div>
                  <div
                    style={{
                      fontSize: "12px",
                      color: "#64748b",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {reply.message_body || "[Media message]"}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
