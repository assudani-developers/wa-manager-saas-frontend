"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Wallet,
  TrendingDown,
  TrendingUp,
  RefreshCw,
  PlusCircle,
  Search,
  Filter,
  ArrowUpRight,
  ArrowDownLeft,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  Phone,
  User,
  Calendar,
  X,
  CreditCard,
  Zap,
} from "lucide-react";
import {
  getBillingSummary,
  getBillingTransactions,
  rechargeClientWallet,
  getClientsDropdown,
  getAdminBillingClients,
} from "../lib/api";
import { getSocket } from "../lib/socket";
import { useToast } from "../components/ToastProvider";

export default function BillingPage() {
  const { showSuccess, showError } = useToast();

  const [summary, setSummary] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Filters
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedType, setSelectedType] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Master Admin State & Money Management
  const [isMasterAdmin, setIsMasterAdmin] = useState(false);
  const [isRechargeModalOpen, setIsRechargeModalOpen] = useState(false);
  const [clients, setClients] = useState([]);
  const [selectedAdminClientId, setSelectedAdminClientId] = useState("all");
  const [adminClientsList, setAdminClientsList] = useState([]);
  const [rechargeClientId, setRechargeClientId] = useState("");
  const [rechargeAmount, setRechargeAmount] = useState("500");
  const [rechargeDescription, setRechargeDescription] = useState("");
  const [submittingRecharge, setSubmittingRecharge] = useState(false);

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
        getClientsDropdown()
          .then((res) => {
            const rawList = res.data?.clients || (Array.isArray(res.data) ? res.data : []);
            const list = rawList.filter(
              (c) => c.role !== "master_admin" && c.username?.toLowerCase() !== "piyushassudani"
            );
            setClients(list);
            const activeId = localStorage.getItem("active_client_id");
            if (activeId) {
              setRechargeClientId(activeId);
            } else if (list.length > 0) {
              setRechargeClientId(list[0].id);
            }
          })
          .catch(() => {});

        getAdminBillingClients()
          .then((res) => setAdminClientsList(res.data?.clients || []))
          .catch(() => {});
      }
    } catch (e) {}
  }, []);

  const loadBillingData = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const sumParams = {};
      const txParams = {
        category: selectedCategory,
        type: selectedType,
        search: searchQuery,
        limit: 100,
      };

      if (selectedAdminClientId !== "all") {
        sumParams.client_id = selectedAdminClientId;
        txParams.client_id = selectedAdminClientId;
      }

      const [sumRes, txRes] = await Promise.all([
        getBillingSummary(sumParams),
        getBillingTransactions(txParams),
      ]);

      setSummary(sumRes.data);
      setTransactions(txRes.data.transactions || []);
      setTotalCount(txRes.data.total || 0);

      if (isRefresh) {
        showSuccess("Billing ledger updated in real time.");
      }
    } catch (err) {
      console.error("Failed to load billing:", err);
      showError(err.response?.data?.error || "Failed to load billing data.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedCategory, selectedType, searchQuery, selectedAdminClientId, showSuccess, showError]);

  useEffect(() => {
    loadBillingData();
  }, [loadBillingData]);

  // Real-time Socket.io Updates for wallet changes & new messages
  useEffect(() => {
    const socket = getSocket();

    const handleUpdate = () => {
      loadBillingData(false);
      if (isMasterAdmin) {
        getAdminBillingClients()
          .then((res) => setAdminClientsList(res.data?.clients || []))
          .catch(() => {});
      }
    };

    socket.on("wallet_updated", handleUpdate);
    socket.on("new_message", handleUpdate);
    socket.on("campaign_progress", handleUpdate);

    return () => {
      socket.off("wallet_updated", handleUpdate);
      socket.off("new_message", handleUpdate);
      socket.off("campaign_progress", handleUpdate);
    };
  }, [loadBillingData, isMasterAdmin]);

  const handleRechargeSubmit = async (e) => {
    e.preventDefault();
    if (!rechargeClientId) {
      showError("Please select a client account to recharge.");
      return;
    }

    const amt = parseFloat(rechargeAmount);
    if (isNaN(amt) || amt <= 0) {
      showError("Please enter a valid positive recharge amount.");
      return;
    }

    setSubmittingRecharge(true);
    try {
      const res = await rechargeClientWallet({
        user_id: rechargeClientId,
        amount: amt,
        description: rechargeDescription.trim() || `Wallet recharge (+₹${amt.toFixed(2)})`,
      });

      showSuccess(res.data?.message || "Wallet credited successfully!");
      setIsRechargeModalOpen(false);
      setRechargeDescription("");
      loadBillingData(true);
    } catch (err) {
      showError(err.response?.data?.error || "Failed to process recharge.");
    } finally {
      setSubmittingRecharge(false);
    }
  };

  const getCategoryBadge = (cat) => {
    const c = (cat || "").toLowerCase();
    switch (c) {
      case "marketing":
        return { label: "Marketing", bg: "rgba(124, 58, 237, 0.1)", color: "#7c3aed", border: "rgba(124, 58, 237, 0.25)" };
      case "utility":
        return { label: "Utility", bg: "rgba(37, 99, 235, 0.1)", color: "#2563eb", border: "rgba(37, 99, 235, 0.25)" };
      case "authentication":
        return { label: "Auth / OTP", bg: "rgba(217, 119, 6, 0.1)", color: "#d97706", border: "rgba(217, 119, 6, 0.25)" };
      case "service":
      default:
        return { label: "Service / Chat", bg: "rgba(16, 185, 129, 0.1)", color: "#059669", border: "rgba(16, 185, 129, 0.25)" };
    }
  };

  return (
    <div className="page-container" style={{ paddingBottom: "40px" }}>
      {/* Header Bar */}
      <div
        className="page-header"
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          flexWrap: "wrap",
          gap: "14px",
          marginBottom: "24px",
        }}
      >
        <div>
          <h1 className="page-title" style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <Wallet size={26} color="var(--accent)" />
            Message Billing &amp; Funds
          </h1>
          <p style={{ fontSize: "13.5px", color: "var(--text-muted)", margin: "4px 0 0" }}>
            Transparent per-message fund deductions, official category rates, and live balance ledger
          </p>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
          {isMasterAdmin && (
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <label style={{ fontSize: "12px", fontWeight: "600", color: "var(--text-secondary)" }}>Client Ledger:</label>
              <select
                value={selectedAdminClientId}
                onChange={(e) => setSelectedAdminClientId(e.target.value)}
                style={{
                  padding: "8px 12px",
                  borderRadius: "10px",
                  border: "1px solid var(--border-color, #cbd5e1)",
                  background: "#ffffff",
                  fontSize: "13px",
                  fontWeight: "600",
                  color: "var(--text-primary)",
                  cursor: "pointer",
                }}
              >
                <option value="all">🏢 All Clients (Global Aggregated)</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    👤 {c.username}
                  </option>
                ))}
              </select>
            </div>
          )}

          {isMasterAdmin && (
            <button
              type="button"
              onClick={() => setIsRechargeModalOpen(true)}
              className="btn-primary"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                fontSize: "13px",
                padding: "9px 16px",
                borderRadius: "10px",
                background: "linear-gradient(135deg, #002277 0%, #1e40af 100%)",
                boxShadow: "0 2px 8px rgba(0, 34, 119, 0.25)",
              }}
            >
              <PlusCircle size={16} />
              <span>Add Funds / Recharge</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => loadBillingData(true)}
            disabled={refreshing || loading}
            className="btn-secondary"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              fontSize: "13px",
              padding: "9px 14px",
              borderRadius: "10px",
            }}
          >
            <RefreshCw size={14} className={refreshing ? "animate-spin" : ""} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Top 3 Summary Metric Cards */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
          gap: "16px",
          marginBottom: "24px",
        }}
      >
        {/* Card 1: Available Wallet Balance */}
        <div
          style={{
            background: "linear-gradient(135deg, #002277 0%, #1e3a8a 100%)",
            borderRadius: "16px",
            padding: "20px 24px",
            color: "#ffffff",
            boxShadow: "0 4px 14px rgba(0, 34, 119, 0.2)",
            position: "relative",
            overflow: "hidden",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "8px" }}>
            <span style={{ fontSize: "12px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px", opacity: 0.85 }}>
              Available Wallet Funds
            </span>
            <span
              style={{
                fontSize: "11px",
                fontWeight: 700,
                padding: "3px 8px",
                borderRadius: "20px",
                background: (summary?.wallet_balance || 0) > 10 ? "rgba(16, 185, 129, 0.3)" : "rgba(239, 68, 68, 0.3)",
                color: "#ffffff",
                display: "inline-flex",
                alignItems: "center",
                gap: "4px",
              }}
            >
              <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: (summary?.wallet_balance || 0) > 10 ? "#10b981" : "#ef4444" }} />
              {(summary?.wallet_balance || 0) > 10 ? "Active Balance" : "Low Funds"}
            </span>
          </div>

          <div style={{ fontSize: "32px", fontWeight: 800, margin: "6px 0", letterSpacing: "-0.5px" }}>
            ₹{(summary?.wallet_balance !== undefined ? summary.wallet_balance : 0).toFixed(2)}
          </div>

          <p style={{ margin: 0, fontSize: "12px", opacity: 0.8, lineHeight: 1.4 }}>
            Direct messages and campaigns automatically deduct from this balance. Zero charges on failed delivery.
          </p>
        </div>

        {/* Card 2: Total Spent */}
        <div
          style={{
            background: "#ffffff",
            border: "1px solid #e2e8f0",
            borderRadius: "16px",
            padding: "20px 24px",
            boxShadow: "0 2px 8px rgba(0, 0, 0, 0.04)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px", color: "#64748b" }}>
            <TrendingDown size={16} color="#ef4444" />
            <span style={{ fontSize: "12px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px" }}>
              Total Funds Used
            </span>
          </div>
          <div style={{ fontSize: "28px", fontWeight: 800, color: "#090d16", margin: "6px 0" }}>
            ₹{(summary?.total_spent || 0).toFixed(2)}
          </div>
          <p style={{ margin: 0, fontSize: "12px", color: "#64748b" }}>
            Total message deductions logged across all successful sends
          </p>
        </div>

        {/* Card 3: Total Messages Sent */}
        <div
          style={{
            background: "#ffffff",
            border: "1px solid #e2e8f0",
            borderRadius: "16px",
            padding: "20px 24px",
            boxShadow: "0 2px 8px rgba(0, 0, 0, 0.04)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px", color: "#64748b" }}>
            <Zap size={16} color="#2563eb" />
            <span style={{ fontSize: "12px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px" }}>
              Messages Dispatched
            </span>
          </div>
          <div style={{ fontSize: "28px", fontWeight: 800, color: "#090d16", margin: "6px 0" }}>
            {(summary?.total_messages_sent || 0).toLocaleString()}
          </div>
          <p style={{ margin: 0, fontSize: "12px", color: "#64748b" }}>
            Official WhatsApp Business Cloud API delivered messages
          </p>
        </div>
      </div>

      {/* Master Admin Client Wallets & Money Management Overview */}
      {isMasterAdmin && adminClientsList.length > 0 && (
        <div
          style={{
            background: "#ffffff",
            borderRadius: "16px",
            border: "1px solid var(--border-color, #e2e8f0)",
            padding: "20px 24px",
            marginBottom: "24px",
            boxShadow: "0 2px 8px rgba(0, 0, 0, 0.04)",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
            <div>
              <h3 style={{ margin: 0, fontSize: "16px", fontWeight: 700, color: "var(--text-primary)" }}>
                💰 Client Wallets &amp; Money Management
              </h3>
              <p style={{ margin: "2px 0 0", fontSize: "12.5px", color: "var(--text-muted)" }}>
                Live balances, total consumption, and instant recharge controls for each client account
              </p>
            </div>
          </div>

          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
              <thead>
                <tr style={{ borderBottom: "2px solid #f1f5f9", background: "#f8fafc" }}>
                  <th style={{ padding: "8px 12px", textAlign: "left", color: "#64748b", fontWeight: 700, fontSize: "11px", textTransform: "uppercase" }}>Client Username</th>
                  <th style={{ padding: "8px 12px", textAlign: "left", color: "#64748b", fontWeight: 700, fontSize: "11px", textTransform: "uppercase" }}>Role</th>
                  <th style={{ padding: "8px 12px", textAlign: "right", color: "#64748b", fontWeight: 700, fontSize: "11px", textTransform: "uppercase" }}>Available Wallet</th>
                  <th style={{ padding: "8px 12px", textAlign: "right", color: "#64748b", fontWeight: 700, fontSize: "11px", textTransform: "uppercase" }}>Total Consumed</th>
                  <th style={{ padding: "8px 12px", textAlign: "center", color: "#64748b", fontWeight: 700, fontSize: "11px", textTransform: "uppercase" }}>Messages Sent</th>
                  <th style={{ padding: "8px 12px", textAlign: "right", color: "#64748b", fontWeight: 700, fontSize: "11px", textTransform: "uppercase" }}>Quick Action</th>
                </tr>
              </thead>
              <tbody>
                {adminClientsList.map((cl) => (
                  <tr key={cl.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                    <td style={{ padding: "12px", fontWeight: 700, color: "#0f172a" }}>
                      👤 {cl.username}
                    </td>
                    <td style={{ padding: "12px" }}>
                      <span style={{ fontSize: "11px", fontWeight: 600, padding: "2px 8px", borderRadius: "12px", background: "rgba(37, 99, 235, 0.08)", color: "#2563eb" }}>
                        Client Workspace
                      </span>
                    </td>
                    <td style={{ padding: "12px", textAlign: "right", fontWeight: 800, color: "#059669", fontSize: "14px" }}>
                      ₹{parseFloat(cl.wallet_balance || 0).toFixed(2)}
                    </td>
                    <td style={{ padding: "12px", textAlign: "right", fontWeight: 600, color: "#64748b" }}>
                      ₹{parseFloat(cl.total_spent || 0).toFixed(2)}
                    </td>
                    <td style={{ padding: "12px", textAlign: "center", fontWeight: 600, color: "#0f172a" }}>
                      {cl.total_messages || 0}
                    </td>
                    <td style={{ padding: "12px", textAlign: "right" }}>
                      <button
                        type="button"
                        onClick={() => {
                          setRechargeClientId(cl.id);
                          setIsRechargeModalOpen(true);
                        }}
                        style={{
                          padding: "6px 12px",
                          borderRadius: "8px",
                          border: "none",
                          background: "#002277",
                          color: "#ffffff",
                          fontSize: "12px",
                          fontWeight: 600,
                          cursor: "pointer",
                        }}
                      >
                        + Add Funds
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Official Category Pricing Strip */}
      <div
        style={{
          background: "#ffffff",
          border: "1px solid #e2e8f0",
          borderRadius: "16px",
          padding: "16px 20px",
          marginBottom: "24px",
          boxShadow: "0 2px 6px rgba(0, 0, 0, 0.03)",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px", flexWrap: "wrap", gap: "8px" }}>
          <div style={{ fontSize: "12.5px", fontWeight: 700, color: "#475569", textTransform: "uppercase", letterSpacing: "0.5px" }}>
            Official Category Rates (INR / Message)
          </div>
          <span style={{ fontSize: "11px", fontWeight: 700, color: "#059669", background: "rgba(16, 185, 129, 0.1)", padding: "2px 8px", borderRadius: "10px", display: "inline-flex", alignItems: "center", gap: "4px" }}>
            <CheckCircle2 size={12} /> Synced with Official Meta WhatsApp Cloud API Schedule (India +91)
          </span>
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
            gap: "12px",
          }}
        >
          {[
            {
              category: "marketing",
              label: "Marketing Messages",
              rate: summary?.rates?.marketing ? `₹${summary.rates.marketing}` : "₹1.015",
              desc: "Meta Base ₹0.86 + 18% GST (Official)",
              count: summary?.breakdown?.marketing?.count || 0,
              spent: summary?.breakdown?.marketing?.spent || 0,
              color: "#7c3aed",
              bg: "rgba(124, 58, 237, 0.06)",
            },
            {
              category: "utility",
              label: "Utility Updates",
              rate: summary?.rates?.utility ? `₹${summary.rates.utility}` : "₹0.413",
              desc: "Order updates, Alerts, Confirmations (+GST)",
              count: summary?.breakdown?.utility?.count || 0,
              spent: summary?.breakdown?.utility?.spent || 0,
              color: "#2563eb",
              bg: "rgba(37, 99, 235, 0.06)",
            },
            {
              category: "service",
              label: "Live Chat / Service",
              rate: summary?.rates?.service ? `₹${summary.rates.service}` : "₹0.354",
              desc: "Customer responses in 24h window (+GST)",
              count: summary?.breakdown?.service?.count || 0,
              spent: summary?.breakdown?.service?.spent || 0,
              color: "#059669",
              bg: "rgba(16, 185, 129, 0.06)",
            },
            {
              category: "authentication",
              label: "Authentication / OTP",
              rate: summary?.rates?.authentication ? `₹${summary.rates.authentication}` : "₹0.354",
              desc: "Login codes, Password resets (+GST)",
              count: summary?.breakdown?.authentication?.count || 0,
              spent: summary?.breakdown?.authentication?.spent || 0,
              color: "#d97706",
              bg: "rgba(217, 119, 6, 0.06)",
            },
          ].map((item) => (
            <div
              key={item.category}
              style={{
                background: item.bg,
                border: `1px solid ${item.color}25`,
                borderRadius: "12px",
                padding: "12px 14px",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
                <span style={{ fontSize: "13px", fontWeight: 700, color: item.color }}>{item.label}</span>
                <span style={{ fontSize: "14px", fontWeight: 800, color: item.color }}>{item.rate}</span>
              </div>
              <div style={{ fontSize: "11px", color: "#64748b", marginBottom: "6px" }}>{item.desc}</div>
              <div style={{ fontSize: "11.5px", fontWeight: 600, color: "#334155" }}>
                Sent: {item.count} • Spent: ₹{item.spent.toFixed(2)}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Transactions Ledger Card */}
      <div
        style={{
          background: "#ffffff",
          border: "1px solid #e2e8f0",
          borderRadius: "16px",
          padding: "20px",
          boxShadow: "0 2px 8px rgba(0, 0, 0, 0.04)",
        }}
      >
        {/* Ledger Header & Filters */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "14px",
            marginBottom: "18px",
          }}
        >
          <div>
            <h2 style={{ fontSize: "16px", fontWeight: 800, color: "#090d16", margin: 0 }}>
              Live Message Ledger ({totalCount})
            </h2>
            <p style={{ fontSize: "12px", color: "#64748b", margin: "2px 0 0" }}>
              Itemized statement of every message sent, funds deducted, and admin recharges
            </p>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
            {/* Search Input */}
            <div style={{ position: "relative" }}>
              <Search
                size={14}
                style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)", color: "#94a3b8" }}
              />
              <input
                type="text"
                placeholder="Search phone or name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  padding: "7px 12px 7px 32px",
                  borderRadius: "8px",
                  border: "1px solid #cbd5e1",
                  fontSize: "12.5px",
                  width: "180px",
                }}
              />
            </div>

            {/* Category Filter */}
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              style={{
                padding: "7px 12px",
                borderRadius: "8px",
                border: "1px solid #cbd5e1",
                fontSize: "12.5px",
                fontWeight: 600,
                color: "#334155",
                background: "#f8fafc",
              }}
            >
              <option value="all">All Categories</option>
              <option value="marketing">Marketing (₹1.015)</option>
              <option value="utility">Utility (₹0.413)</option>
              <option value="service">Service / Chat (₹0.354)</option>
              <option value="authentication">Auth / OTP (₹0.354)</option>
            </select>

            {/* Type Filter */}
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              style={{
                padding: "7px 12px",
                borderRadius: "8px",
                border: "1px solid #cbd5e1",
                fontSize: "12.5px",
                fontWeight: 600,
                color: "#334155",
                background: "#f8fafc",
              }}
            >
              <option value="all">All Types</option>
              <option value="debit">Deductions Only</option>
              <option value="credit">Wallet Recharges</option>
              <option value="refund">Refunds</option>
            </select>
          </div>
        </div>

        {/* Ledger Table */}
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
            <thead>
              <tr style={{ borderBottom: "2px solid #f1f5f9", background: "#f8fafc" }}>
                <th style={{ padding: "10px 12px", textAlign: "left", color: "#64748b", fontWeight: 700, fontSize: "11.5px", textTransform: "uppercase" }}>Time &amp; Date</th>
                {isMasterAdmin && (
                  <th style={{ padding: "10px 12px", textAlign: "left", color: "#64748b", fontWeight: 700, fontSize: "11.5px", textTransform: "uppercase" }}>Client</th>
                )}
                <th style={{ padding: "10px 12px", textAlign: "left", color: "#64748b", fontWeight: 700, fontSize: "11.5px", textTransform: "uppercase" }}>Recipient / Target</th>
                <th style={{ padding: "10px 12px", textAlign: "left", color: "#64748b", fontWeight: 700, fontSize: "11.5px", textTransform: "uppercase" }}>Category</th>
                <th style={{ padding: "10px 12px", textAlign: "left", color: "#64748b", fontWeight: 700, fontSize: "11.5px", textTransform: "uppercase" }}>Description</th>
                <th style={{ padding: "10px 12px", textAlign: "right", color: "#64748b", fontWeight: 700, fontSize: "11.5px", textTransform: "uppercase" }}>Amount</th>
                <th style={{ padding: "10px 12px", textAlign: "right", color: "#64748b", fontWeight: 700, fontSize: "11.5px", textTransform: "uppercase" }}>Balance After</th>
                <th style={{ padding: "10px 12px", textAlign: "center", color: "#64748b", fontWeight: 700, fontSize: "11.5px", textTransform: "uppercase" }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={isMasterAdmin ? 8 : 7} style={{ padding: "40px", textAlign: "center", color: "#94a3b8" }}>
                    Loading billing statement...
                  </td>
                </tr>
              ) : transactions.length === 0 ? (
                <tr>
                  <td colSpan={isMasterAdmin ? 8 : 7} style={{ padding: "40px", textAlign: "center", color: "#94a3b8" }}>
                    No message transactions match your active filters.
                  </td>
                </tr>
              ) : (
                transactions.map((tx) => {
                  const isDebit = tx.type === "debit";
                  const isCredit = tx.type === "credit";
                  const isRefund = tx.type === "refund";
                  const catBadge = getCategoryBadge(tx.category);

                  const formattedDate = new Date(tx.created_at).toLocaleString("en-IN", {
                    month: "short",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  });

                  return (
                    <tr key={tx.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                      {/* Date */}
                      <td style={{ padding: "12px", color: "#64748b", whiteSpace: "nowrap", fontSize: "12px" }}>
                        {formattedDate}
                      </td>

                      {/* Client (Master Admin View) */}
                      {isMasterAdmin && (
                        <td style={{ padding: "12px", whiteSpace: "nowrap" }}>
                          <span
                            style={{
                              fontSize: "11px",
                              fontWeight: 700,
                              padding: "2px 8px",
                              borderRadius: "6px",
                              background: "rgba(59, 130, 246, 0.1)",
                              color: "#2563eb",
                            }}
                          >
                            👤 {tx.client_username || "Direct Inbound"}
                          </span>
                        </td>
                      )}

                      {/* Recipient */}
                      <td style={{ padding: "12px", whiteSpace: "nowrap" }}>
                        {tx.recipient_phone ? (
                          <div>
                            <div style={{ fontWeight: 700, color: "#0f172a" }}>
                              {tx.recipient_name || tx.recipient_phone}
                            </div>
                            {tx.recipient_name && (
                              <div style={{ fontSize: "11px", color: "#64748b" }}>{tx.recipient_phone}</div>
                            )}
                          </div>
                        ) : (
                          <span style={{ color: "#94a3b8", fontSize: "12px" }}>Platform Admin</span>
                        )}
                      </td>

                      {/* Category Badge */}
                      <td style={{ padding: "12px", whiteSpace: "nowrap" }}>
                        <span
                          style={{
                            fontSize: "11px",
                            fontWeight: 700,
                            padding: "3px 8px",
                            borderRadius: "12px",
                            background: catBadge.bg,
                            color: catBadge.color,
                            border: `1px solid ${catBadge.border}`,
                          }}
                        >
                          {catBadge.label}
                        </span>
                      </td>

                      {/* Description */}
                      <td style={{ padding: "12px", color: "#334155", maxWidth: "260px" }}>
                        <div style={{ fontSize: "12.5px", fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {tx.description || "Message dispatch"}
                        </div>
                      </td>

                      {/* Amount */}
                      <td style={{ padding: "12px", textAlign: "right", whiteSpace: "nowrap" }}>
                        <span
                          style={{
                            fontWeight: 800,
                            fontSize: "13.5px",
                            color: isDebit ? "#ef4444" : "#059669",
                          }}
                        >
                          {isDebit ? `-₹${parseFloat(tx.amount).toFixed(2)}` : `+₹${parseFloat(tx.amount).toFixed(2)}`}
                        </span>
                      </td>

                      {/* Balance After */}
                      <td style={{ padding: "12px", textAlign: "right", whiteSpace: "nowrap", fontWeight: 600, color: "#0f172a" }}>
                        ₹{parseFloat(tx.balance_after || 0).toFixed(2)}
                      </td>

                      {/* Status */}
                      <td style={{ padding: "12px", textAlign: "center", whiteSpace: "nowrap" }}>
                        <span
                          style={{
                            fontSize: "11px",
                            fontWeight: 700,
                            padding: "2px 8px",
                            borderRadius: "10px",
                            background: tx.status === "refunded" ? "rgba(239, 68, 68, 0.1)" : "rgba(16, 185, 129, 0.1)",
                            color: tx.status === "refunded" ? "#ef4444" : "#059669",
                          }}
                        >
                          {tx.status === "refunded" ? "Refunded" : "Completed"}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Master Admin Recharge Modal */}
      {isRechargeModalOpen && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0, 0, 0, 0.5)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
            padding: "20px",
          }}
        >
          <div
            style={{
              background: "#ffffff",
              borderRadius: "16px",
              maxWidth: "460px",
              width: "100%",
              padding: "24px",
              boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.2)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "18px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <div style={{ width: "36px", height: "36px", borderRadius: "10px", background: "rgba(0, 34, 119, 0.1)", display: "flex", alignItems: "center", justifyContent: "center", color: "#002277" }}>
                  <PlusCircle size={20} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: "16px", fontWeight: 800, color: "#090d16" }}>
                    Add Funds / Recharge Wallet
                  </h3>
                  <p style={{ margin: 0, fontSize: "12px", color: "#64748b" }}>
                    Credit client balance for sending WhatsApp messages
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsRechargeModalOpen(false)}
                style={{ background: "none", border: "none", cursor: "pointer", color: "#94a3b8" }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleRechargeSubmit}>
              {/* Select Client */}
              <div style={{ marginBottom: "16px" }}>
                <label style={{ display: "block", fontSize: "12.5px", fontWeight: 700, marginBottom: "6px", color: "#090d16" }}>
                  Select Client Account
                </label>
                <select
                  value={rechargeClientId}
                  onChange={(e) => setRechargeClientId(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "10px 12px",
                    borderRadius: "10px",
                    border: "1px solid #cbd5e1",
                    fontSize: "13.5px",
                    fontWeight: 600,
                    color: "#0f172a",
                    background: "#f8fafc",
                  }}
                  required
                >
                  <option value="">-- Choose Client Organization --</option>
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.username}
                    </option>
                  ))}
                </select>
              </div>

              {/* Amount Input */}
              <div style={{ marginBottom: "16px" }}>
                <label style={{ display: "block", fontSize: "12.5px", fontWeight: 700, marginBottom: "6px", color: "#090d16" }}>
                  Recharge Amount (INR ₹)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="1"
                  value={rechargeAmount}
                  onChange={(e) => setRechargeAmount(e.target.value)}
                  placeholder="e.g. 500"
                  style={{
                    width: "100%",
                    padding: "10px 14px",
                    borderRadius: "10px",
                    border: "1px solid #cbd5e1",
                    fontSize: "16px",
                    fontWeight: 800,
                    color: "#002277",
                  }}
                  required
                />
                {/* Quick Chips */}
                <div style={{ display: "flex", gap: "8px", marginTop: "8px" }}>
                  {[200, 500, 1000, 2000, 5000].map((amt) => (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => setRechargeAmount(String(amt))}
                      style={{
                        padding: "4px 10px",
                        borderRadius: "8px",
                        fontSize: "11.5px",
                        fontWeight: 700,
                        background: rechargeAmount === String(amt) ? "#002277" : "#f1f5f9",
                        color: rechargeAmount === String(amt) ? "#ffffff" : "#475569",
                        border: "1px solid #e2e8f0",
                        cursor: "pointer",
                      }}
                    >
                      +₹{amt}
                    </button>
                  ))}
                </div>
              </div>

              {/* Note / Description */}
              <div style={{ marginBottom: "20px" }}>
                <label style={{ display: "block", fontSize: "12.5px", fontWeight: 700, marginBottom: "6px", color: "#090d16" }}>
                  Recharge Note / Reference (Optional)
                </label>
                <input
                  type="text"
                  value={rechargeDescription}
                  onChange={(e) => setRechargeDescription(e.target.value)}
                  placeholder="e.g. Diwali Marketing Campaign Recharge"
                  style={{
                    width: "100%",
                    padding: "9px 12px",
                    borderRadius: "10px",
                    border: "1px solid #cbd5e1",
                    fontSize: "13px",
                  }}
                />
              </div>

              {/* Action Buttons */}
              <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
                <button
                  type="button"
                  onClick={() => setIsRechargeModalOpen(false)}
                  className="btn-secondary"
                  style={{ padding: "9px 16px", fontSize: "13px" }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingRecharge}
                  className="btn-primary"
                  style={{
                    padding: "9px 20px",
                    fontSize: "13px",
                    fontWeight: 700,
                    background: "linear-gradient(135deg, #002277 0%, #1e40af 100%)",
                  }}
                >
                  {submittingRecharge ? "Recharging..." : "Confirm & Add Funds"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

