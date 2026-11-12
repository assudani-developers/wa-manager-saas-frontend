"use client";

import { useEffect, useState } from "react";
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Eye,
  EyeOff,
  RefreshCw,
  Save,
  ShieldAlert,
  UserCog,
  Copy,
  Check,
  Server,
  Globe,
  Webhook,
  ShieldCheck,
  Smartphone,
  ExternalLink,
  Sliders,
  Cpu,
  Users,
  UserPlus,
  Trash2,
} from "lucide-react";
import api, {
  getAccountHealth,
  getChannelConfig,
  saveChannelConfig,
  testMetaCredentials,
  getTeamMembers,
  createTeamMember,
  deleteTeamMember,
} from "../lib/api";
import { useToast } from "../components/ToastProvider";

const getTierDescription = (tier) => {
  const tierDescriptions = {
    TIER_250: "250 business-initiated conversations per rolling 24 hours",
    TIER_1K: "1,000 business-initiated conversations per rolling 24 hours",
    TIER_10K: "10,000 business-initiated conversations per rolling 24 hours",
    TIER_100K: "100,000 business-initiated conversations per rolling 24 hours",
    TIER_UNLIMITED: "Unlimited business-initiated conversations",
  };

  return tierDescriptions[tier?.toUpperCase()] || "Standard Meta Tier Limit";
};

const getQualityStyle = (quality) => {
  switch (quality?.toUpperCase()) {
    case "GREEN":
      return { color: "#15803d", background: "#dcfce7", border: "#86efac", Icon: CheckCircle2, label: "High Quality (Good)" };
    case "YELLOW":
      return { color: "#a16207", background: "#fef9c3", border: "#fde047", Icon: AlertTriangle, label: "Medium Quality (Warning)" };
    case "RED":
      return { color: "#b91c1c", background: "#fee2e2", border: "#fca5a5", Icon: ShieldAlert, label: "Low Quality (Critical)" };
    default:
      return { color: "var(--text-secondary)", background: "var(--bg-tertiary)", border: "var(--border-color)", Icon: Activity, label: quality || "Active" };
  }
};

export default function SettingsPage() {
  const { showSuccess, showError } = useToast();
  const [activeTab, setActiveTab] = useState("credentials"); // credentials, team, account, webhook, system

  const [isClientView, setIsClientView] = useState(false);
  const [activeClientName, setActiveClientName] = useState("");

  const [metaHealth, setMetaHealth] = useState(null);
  const [healthLoading, setHealthLoading] = useState(true);
  const [healthError, setHealthError] = useState("");

  const [currentUsername, setCurrentUsername] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newUsername, setNewUsername] = useState("");
  const [newPassword, setNewPassword] = useState("");

  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [copiedKey, setCopiedKey] = useState(null);

  // Team Members & Sub-Logins State
  const [teamMembers, setTeamMembers] = useState([]);
  const [teamLoading, setTeamLoading] = useState(false);
  const [newTeamUsername, setNewTeamUsername] = useState("");
  const [newTeamPassword, setNewTeamPassword] = useState("");
  const [showTeamPassword, setShowTeamPassword] = useState(false);
  const [visibleTeamPasswords, setVisibleTeamPasswords] = useState({});
  const [addingTeamMember, setAddingTeamMember] = useState(false);

  const loadTeam = () => {
    setTeamLoading(true);
    getTeamMembers()
      .then((res) => setTeamMembers(res.data.team || []))
      .catch((err) => console.warn("Load team err:", err.message))
      .finally(() => setTeamLoading(false));
  };

  useEffect(() => {
    if (activeTab === "team") {
      loadTeam();
    }
  }, [activeTab]);

  const handleAddTeamMember = async (e) => {
    e.preventDefault();
    if (!newTeamUsername.trim() || !newTeamPassword.trim()) {
      showError("Please enter both username and password.");
      return;
    }
    setAddingTeamMember(true);
    try {
      const res = await createTeamMember({
        username: newTeamUsername.trim(),
        password: newTeamPassword.trim(),
      });
      showSuccess(res.data.message || "Team member login created successfully!");
      setNewTeamUsername("");
      setNewTeamPassword("");
      loadTeam();
    } catch (err) {
      showError(err.response?.data?.error || "Failed to create team member.");
    } finally {
      setAddingTeamMember(false);
    }
  };

  const handleDeleteTeamMember = async (id, uname) => {
    if (!window.confirm(`Are you sure you want to delete login "${uname}"?`)) return;
    try {
      await deleteTeamMember(id);
      showSuccess(`Login "${uname}" removed.`);
      loadTeam();
    } catch (err) {
      showError(err.response?.data?.error || "Failed to delete team member.");
    }
  };

  useEffect(() => {
    let isMounted = true;

    try {
      const role = localStorage.getItem("user_role");
      const userStr = localStorage.getItem("user");
      const user = userStr ? JSON.parse(userStr) : null;
      const isMaster = role === "master_admin" || user?.role === "master_admin" || user?.username?.toLowerCase() === "piyushassudani";
      const activeClientId = localStorage.getItem("active_client_id");
      const savedClientName = localStorage.getItem("active_client_name");
      const clientMode = !isMaster || Boolean(activeClientId);
      setIsClientView(clientMode);
      setActiveClientName(savedClientName || user?.username || "Client");
      setActiveTab("credentials");
    } catch (e) {}

    getAccountHealth()
      .then((res) => {
        if (isMounted) setMetaHealth(res.data);
      })
      .catch((err) => {
        if (isMounted) {
          setHealthError(err.response?.data?.error || "Failed to load Meta account health.");
        }
      })
      .finally(() => {
        if (isMounted) setHealthLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const handleTestPersonalMeta = async () => {
    if (!personalPhoneId.trim() || !personalToken.trim()) {
      showError("Please enter both Phone Number ID and Access Token to test.");
      return;
    }

    setTestingChannel(true);
    setChannelTestResult(null);

    try {
      const res = await testMetaCredentials({
        phone_number_id: personalPhoneId.trim(),
        access_token: personalToken.trim(),
      });

      if (res.data?.success) {
        setChannelTestResult({
          success: true,
          message: `Verified: ${res.data.data?.verified_name || "Active"} (${res.data.data?.display_phone_number || "Meta OK"})`,
        });
        showSuccess("Personal Meta credentials verified successfully!");
      } else {
        setChannelTestResult({
          success: false,
          message: res.data?.error || "Verification failed.",
        });
        showError(res.data?.error || "Verification failed.");
      }
    } catch (err) {
      const msg = err.response?.data?.error || err.message;
      setChannelTestResult({ success: false, message: msg });
      showError(`Meta validation error: ${msg}`);
    } finally {
      setTestingChannel(false);
    }
  };

  const handleSaveChannel = async () => {
    setSavingChannel(true);
    try {
      const payload = {
        mode: channelMode,
        meta_phone_number_id: personalPhoneId.trim() || null,
        meta_waba_id: personalWabaId.trim() || null,
      };

      if (personalToken.trim()) {
        payload.meta_access_token = personalToken.trim();
      }

      const res = await saveChannelConfig(payload);
      showSuccess(res.data?.message || "WhatsApp channel updated successfully!");

      const refreshed = await getChannelConfig();
      setChannelData(refreshed.data);
      setChannelMode(refreshed.data.active_mode || "company");
    } catch (err) {
      showError(err.response?.data?.error || "Failed to update channel.");
    } finally {
      setSavingChannel(false);
    }
  };

  const refreshMetaHealth = async () => {
    setHealthLoading(true);
    setHealthError("");
    try {
      const res = await getAccountHealth();
      setMetaHealth(res.data);
      showSuccess("Account health refreshed from Meta.");
    } catch (err) {
      setHealthError(err.response?.data?.error || "Failed to load Meta account health.");
      showError("Could not refresh account health.");
    } finally {
      setHealthLoading(false);
    }
  };

  const handleCopy = (text, key) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    showSuccess("Copied to clipboard!");
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    try {
      await api.put("/api/auth/profile", {
        currentUsername,
        currentPassword,
        newUsername,
        newPassword,
      });

      const msg = "Profile updated successfully! Please use your new credentials on your next login.";
      setSuccess(msg);
      showSuccess(msg);
      setCurrentPassword("");
      setNewPassword("");
    } catch (err) {
      console.error(err);
      const errMsg = err.response?.data?.error || "Failed to update profile.";
      setError(errMsg);
      showError(errMsg);
    } finally {
      setLoading(false);
    }
  };

  const visibleTabs = isClientView
    ? [
        { id: "credentials", label: "Account Credentials", icon: UserCog },
        { id: "team", label: "Team Members & Sub-Logins", icon: Users },
      ]
    : [
        { id: "account", label: "Meta Cloud Account", icon: Smartphone },
        { id: "credentials", label: "Admin Credentials", icon: UserCog },
        { id: "webhook", label: "Webhook & API Endpoints", icon: Webhook },
        { id: "system", label: "System Information", icon: Cpu },
      ];

  return (
    <div className="page-container" style={{ paddingBottom: "40px" }}>
      <div className="page-header" style={{ marginBottom: "20px" }}>
        <div>
          <h1 className="page-title">Settings &amp; Configuration</h1>
          <p style={{ fontSize: "13.5px", color: "var(--text-muted)", margin: "4px 0 0" }}>
            {isClientView
              ? `Manage workspace credentials and team sub-logins for ${activeClientName || "your account"}`
              : "Manage your Meta WhatsApp Cloud API status, admin credentials, and webhook endpoints"}
          </p>
        </div>
      </div>

      {/* Modern Segmented Navigation Tabs */}
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          background: "#f1f5f9",
          padding: "6px",
          borderRadius: "14px",
          border: "1px solid #e2e8f0",
          gap: "8px",
          marginBottom: "24px",
          maxWidth: "100%",
        }}
      >
        {visibleTabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              type="button"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                padding: "9px 18px",
                borderRadius: "10px",
                fontSize: "13.5px",
                fontWeight: isActive ? "600" : "500",
                background: isActive ? "#ffffff" : "transparent",
                color: isActive ? "var(--accent)" : "#64748b",
                border: isActive ? "1px solid rgba(0, 0, 0, 0.08)" : "1px solid transparent",
                boxShadow: isActive ? "0 2px 6px rgba(0, 0, 0, 0.06), 0 1px 2px rgba(0, 0, 0, 0.04)" : "none",
                cursor: "pointer",
                transition: "all 0.15s ease",
                whiteSpace: "nowrap",
              }}
            >
              <Icon size={16} strokeWidth={isActive ? 2.2 : 1.8} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      <div className="page-content" style={{ maxWidth: "960px" }}>
        {/* ========================================================= */}
        {/* TAB 1: META CLOUD ACCOUNT HEALTH (MASTER ADMIN ONLY) */}
        {/* ========================================================= */}
        {!isClientView && activeTab === "account" && (
          <section className="ui-card animate-fade-in" style={{ transform: "none" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <div style={{ width: "44px", height: "44px", borderRadius: "12px", background: "var(--accent-glow)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--accent)" }}>
                  <Smartphone size={22} />
                </div>
                <div>
                  <h2 style={{ fontSize: "17px", fontWeight: "700", color: "var(--text-primary)", margin: 0 }}>
                    WhatsApp Cloud Account Status
                  </h2>
                  <p style={{ fontSize: "13px", color: "var(--text-muted)", margin: "2px 0 0" }}>
                    Live status and tier limits reported by Meta Business API
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={refreshMetaHealth}
                disabled={healthLoading}
                className="btn-secondary"
                style={{ display: "inline-flex", alignItems: "center", gap: "6px", fontSize: "12.5px", padding: "8px 14px" }}
              >
                <RefreshCw size={14} className={healthLoading ? "animate-spin" : ""} />
                <span>Refresh</span>
              </button>
            </div>

            {healthLoading ? (
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "160px", color: "var(--text-muted)" }}>
                Checking Meta Cloud API status...
              </div>
            ) : healthError ? (
              <div style={{ padding: "16px", borderRadius: "12px", background: "#fef2f2", border: "1px solid #fee2e2", color: "#991b1b", fontSize: "13.5px" }}>
                <div style={{ fontWeight: 600, marginBottom: "4px" }}>Notice</div>
                <div>{healthError}</div>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
                {/* Meta Verified Info Cards */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "14px" }}>
                  {/* Quality Rating */}
                  <div style={{ padding: "16px", background: "var(--bg-tertiary)", border: "1px solid var(--border-color)", borderRadius: "12px" }}>
                    <div style={{ fontSize: "12px", fontWeight: "600", color: "var(--text-muted)", textTransform: "uppercase", marginBottom: "8px" }}>
                      Quality Rating
                    </div>
                    {(() => {
                      const quality = metaHealth?.quality_rating || "GREEN";
                      const { color, background, border, Icon, label } = getQualityStyle(quality);
                      return (
                        <div style={{ display: "inline-flex", alignItems: "center", gap: "8px", padding: "6px 12px", borderRadius: "999px", background, color, border: `1px solid ${border}`, fontWeight: "600", fontSize: "13px" }}>
                          <Icon size={16} />
                          <span>{label}</span>
                        </div>
                      );
                    })()}
                    <p style={{ fontSize: "12px", color: "var(--text-muted)", margin: "10px 0 0", lineHeight: "1.4" }}>
                      Indicates whether your sent messages are received favorably by customers.
                    </p>
                  </div>

                  {/* Messaging Tier */}
                  <div style={{ padding: "16px", background: "var(--bg-tertiary)", border: "1px solid var(--border-color)", borderRadius: "12px" }}>
                    <div style={{ fontSize: "12px", fontWeight: "600", color: "var(--text-muted)", textTransform: "uppercase", marginBottom: "8px" }}>
                      Messaging Tier Limit
                    </div>
                    <div style={{ fontSize: "20px", fontWeight: "700", color: "var(--text-primary)" }}>
                      {metaHealth?.messaging_limit_tier?.replace(/^TIER_/, "") || "1,000"} <span style={{ fontSize: "13px", fontWeight: "500", color: "var(--text-muted)" }}>conversations/24h</span>
                    </div>
                    <p style={{ fontSize: "12px", color: "var(--text-muted)", margin: "10px 0 0", lineHeight: "1.4" }}>
                      {getTierDescription(metaHealth?.messaging_limit_tier || "TIER_1K")}
                    </p>
                  </div>
                </div>

                {/* Account Details Row */}
                <div style={{ padding: "16px", background: "var(--bg-primary)", border: "1px solid var(--border-color)", borderRadius: "12px", display: "flex", flexDirection: "column", gap: "10px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--border-color)", paddingBottom: "10px" }}>
                    <span style={{ fontSize: "13px", color: "var(--text-muted)" }}>Verified Business Name</span>
                    <span style={{ fontSize: "13.5px", fontWeight: "600", color: "var(--text-primary)" }}>
                      {metaHealth?.verified_name || "Assudani WA Automations"}
                    </span>
                  </div>

                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--border-color)", paddingBottom: "10px" }}>
                    <span style={{ fontSize: "13px", color: "var(--text-muted)" }}>WhatsApp Phone Number</span>
                    <span style={{ fontSize: "13.5px", fontWeight: "600", color: "var(--accent)" }}>
                      {metaHealth?.display_phone_number || "Meta Connected"}
                    </span>
                  </div>

                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: "13px", color: "var(--text-muted)" }}>Meta Cloud API Version</span>
                    <span style={{ fontSize: "12.5px", fontWeight: "500", padding: "2px 8px", background: "var(--bg-tertiary)", borderRadius: "6px" }}>
                      v21.0 (Latest Enterprise)
                    </span>
                  </div>
                </div>
              </div>
            )}
          </section>
        )}

        {/* Sender Channel Tab Removed for Clients */}
        {false && activeTab === "channel" && (
          <section className="ui-card animate-fade-in" style={{ transform: "none" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "22px" }}>
              <div style={{ width: "42px", height: "42px", borderRadius: "12px", background: "rgba(37, 99, 235, 0.1)", display: "flex", alignItems: "center", justifyContent: "center", color: "#2563eb" }}>
                <Sliders size={22} />
              </div>
              <div>
                <h2 style={{ fontSize: "17px", fontWeight: "700", color: "var(--text-primary)", margin: 0 }}>
                  WhatsApp Sending Channel
                </h2>
                <p style={{ fontSize: "13px", color: "var(--text-muted)", margin: "2px 0 0" }}>
                  Select whether to send messages via the central Company Number or your own Personal Meta Cloud API
                </p>
              </div>
            </div>

            {/* Mode Selection Cards */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "24px" }}>
              {/* Option 1: Company Number */}
              <div
                onClick={() => setChannelMode("company")}
                style={{
                  padding: "18px",
                  borderRadius: "12px",
                  border: `2px solid ${channelMode === "company" ? "#2563eb" : "var(--border-color)"}`,
                  background: channelMode === "company" ? "rgba(37, 99, 235, 0.04)" : "var(--bg-secondary)",
                  cursor: "pointer",
                  transition: "all 0.15s ease",
                  position: "relative",
                }}
              >
                {channelMode === "company" && (
                  <div style={{ position: "absolute", top: "12px", right: "12px", color: "#2563eb" }}>
                    <CheckCircle2 size={18} />
                  </div>
                )}
                <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "8px" }}>
                  <div style={{ width: "32px", height: "32px", borderRadius: "8px", background: "rgba(5, 150, 105, 0.12)", display: "flex", alignItems: "center", justifyContent: "center", color: "#059669" }}>
                    <Smartphone size={18} />
                  </div>
                  <h3 style={{ margin: 0, fontSize: "15px", fontWeight: 700, color: "var(--text-primary)" }}>
                    Company WhatsApp Number
                  </h3>
                </div>
                <p style={{ margin: "4px 0 12px", fontSize: "12.5px", color: "var(--text-muted)", lineHeight: 1.4 }}>
                  {channelData?.company?.phone_number
                    ? `Use the central verified platform number (${channelData.company.phone_number}). Fully managed, zero setup required.`
                    : "Use the central verified platform WhatsApp channel. Fully managed, zero setup required."}
                </p>
                <div style={{ display: "inline-block", padding: "3px 8px", borderRadius: "6px", background: "rgba(5, 150, 105, 0.1)", color: "#059669", fontSize: "11px", fontWeight: 600 }}>
                  {channelData?.company?.phone_number ? `Verified: ${channelData.company.phone_number}` : "Active Platform Shared Channel"}
                </div>
              </div>

              {/* Option 2: Personal Meta API */}
              <div
                onClick={() => setChannelMode("personal")}
                style={{
                  padding: "18px",
                  borderRadius: "12px",
                  border: `2px solid ${channelMode === "personal" ? "#7c3aed" : "var(--border-color)"}`,
                  background: channelMode === "personal" ? "rgba(124, 58, 237, 0.04)" : "var(--bg-secondary)",
                  cursor: "pointer",
                  transition: "all 0.15s ease",
                  position: "relative",
                }}
              >
                {channelMode === "personal" && (
                  <div style={{ position: "absolute", top: "12px", right: "12px", color: "#7c3aed" }}>
                    <CheckCircle2 size={18} />
                  </div>
                )}
                <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "8px" }}>
                  <div style={{ width: "32px", height: "32px", borderRadius: "8px", background: "rgba(124, 58, 237, 0.12)", display: "flex", alignItems: "center", justifyContent: "center", color: "#7c3aed" }}>
                    <Cpu size={18} />
                  </div>
                  <h3 style={{ margin: 0, fontSize: "15px", fontWeight: 700, color: "var(--text-primary)" }}>
                    Personal Meta Cloud API
                  </h3>
                </div>
                <p style={{ margin: "4px 0 12px", fontSize: "12.5px", color: "var(--text-muted)", lineHeight: 1.4 }}>
                  Connect your own WhatsApp Business Cloud account credentials to send from your branded number.
                </p>
                <div style={{ display: "inline-block", padding: "3px 8px", borderRadius: "6px", background: "rgba(124, 58, 237, 0.1)", color: "#7c3aed", fontSize: "11px", fontWeight: 600 }}>
                  Bring Your Own Meta API Key
                </div>
              </div>
            </div>

            {/* Personal Mode Configuration Fields */}
            {channelMode === "personal" && (
              <div style={{ background: "var(--bg-tertiary)", border: "1px solid var(--border-color)", borderRadius: "12px", padding: "20px", marginBottom: "20px" }}>
                <h4 style={{ margin: "0 0 16px", fontSize: "14px", fontWeight: 700, color: "var(--text-primary)" }}>
                  Personal Meta Cloud Credentials
                </h4>

                <div style={{ marginBottom: "14px" }}>
                  <label style={{ display: "block", fontSize: "12.5px", fontWeight: 600, marginBottom: "6px", color: "var(--text-primary)" }}>
                    WhatsApp Phone Number ID
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 1029384756102938"
                    value={personalPhoneId}
                    onChange={(e) => setPersonalPhoneId(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "10px 12px",
                      borderRadius: "8px",
                      background: "var(--bg-secondary)",
                      border: "1px solid var(--border-color)",
                      color: "var(--text-primary)",
                      fontSize: "13.5px",
                    }}
                  />
                </div>

                <div style={{ marginBottom: "14px" }}>
                  <label style={{ display: "block", fontSize: "12.5px", fontWeight: 600, marginBottom: "6px", color: "var(--text-primary)" }}>
                    WhatsApp Business Account ID (WABA ID)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 9876543210987654"
                    value={personalWabaId}
                    onChange={(e) => setPersonalWabaId(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "10px 12px",
                      borderRadius: "8px",
                      background: "var(--bg-secondary)",
                      border: "1px solid var(--border-color)",
                      color: "var(--text-primary)",
                      fontSize: "13.5px",
                    }}
                  />
                </div>

                <div style={{ marginBottom: "14px" }}>
                  <label style={{ display: "block", fontSize: "12.5px", fontWeight: 600, marginBottom: "6px", color: "var(--text-primary)" }}>
                    Permanent System User Access Token
                  </label>
                  <div style={{ position: "relative" }}>
                    <input
                      type={showPersonalToken ? "text" : "password"}
                      placeholder="Paste your Meta System User Access Token (EAAV...)"
                      value={personalToken}
                      onChange={(e) => setPersonalToken(e.target.value)}
                      style={{
                        width: "100%",
                        padding: "10px 40px 10px 12px",
                        borderRadius: "8px",
                        background: "var(--bg-secondary)",
                        border: "1px solid var(--border-color)",
                        color: "var(--text-primary)",
                        fontSize: "13.5px",
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPersonalToken(!showPersonalToken)}
                      style={{
                        position: "absolute",
                        right: "10px",
                        top: "50%",
                        transform: "translateY(-50%)",
                        background: "none",
                        border: "none",
                        color: "var(--text-muted)",
                        cursor: "pointer",
                      }}
                    >
                      {showPersonalToken ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                  <button
                    type="button"
                    onClick={handleTestPersonalMeta}
                    disabled={testingChannel}
                    style={{
                      padding: "8px 14px",
                      borderRadius: "8px",
                      background: "rgba(124, 58, 237, 0.15)",
                      border: "1px solid rgba(124, 58, 237, 0.3)",
                      color: "#7c3aed",
                      cursor: "pointer",
                      fontSize: "13px",
                      fontWeight: 600,
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                    }}
                  >
                    <RefreshCw size={14} className={testingChannel ? "spin-animation" : ""} />
                    {testingChannel ? "Verifying with Meta..." : "Test Connection"}
                  </button>

                  {channelTestResult && (
                    <div style={{ fontSize: "13px", color: channelTestResult.success ? "#059669" : "#dc2626", fontWeight: 600 }}>
                      {channelTestResult.message}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Save Button */}
            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <button
                type="button"
                onClick={handleSaveChannel}
                disabled={savingChannel}
                style={{
                  padding: "10px 24px",
                  borderRadius: "8px",
                  background: "linear-gradient(135deg, #002277 0%, #1e40af 100%)",
                  border: "none",
                  color: "#ffffff",
                  fontSize: "14px",
                  fontWeight: 600,
                  cursor: "pointer",
                  boxShadow: "0 2px 8px rgba(0, 34, 119, 0.25)",
                }}
              >
                {savingChannel ? "Saving..." : "Save & Activate Channel"}
              </button>
            </div>
          </section>
        )}

        {/* ========================================================= */}
        {/* TAB: TEAM LOGINS & SUB-ACCOUNTS */}
        {/* ========================================================= */}
        {activeTab === "team" && (
          <section className="ui-card animate-fade-in" style={{ transform: "none" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "22px" }}>
              <div style={{ width: "42px", height: "42px", borderRadius: "12px", background: "rgba(16, 185, 129, 0.1)", display: "flex", alignItems: "center", justifyContent: "center", color: "#10b981" }}>
                <Users size={22} />
              </div>
              <div>
                <h2 style={{ fontSize: "17px", fontWeight: "700", color: "var(--text-primary)", margin: 0 }}>
                  Team Members &amp; Sub-Logins
                </h2>
                <p style={{ fontSize: "13px", color: "var(--text-muted)", margin: "2px 0 0" }}>
                  Create separate login credentials for staff members to access this client workspace
                </p>
              </div>
            </div>

            {/* Create new sub-login */}
            <form
              onSubmit={handleAddTeamMember}
              autoComplete="off"
              style={{ background: "var(--bg-secondary)", border: "1px solid var(--border-color)", borderRadius: "12px", padding: "18px", marginBottom: "24px" }}
            >
              {/* Hidden dummy fields to prevent browser autofill */}
              <input type="text" style={{ display: "none" }} tabIndex={-1} autoComplete="off" />
              <input type="password" style={{ display: "none" }} tabIndex={-1} autoComplete="off" />

              <h3 style={{ fontSize: "14px", fontWeight: 600, color: "var(--text-primary)", margin: "0 0 14px 0", display: "flex", alignItems: "center", gap: "8px" }}>
                <UserPlus size={16} color="var(--accent)" />
                Add New Team Login
              </h3>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "12px", alignItems: "flex-end" }}>
                <div>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "var(--text-muted)", marginBottom: "6px" }}>
                    Staff Username
                  </label>
                  <input
                    type="text"
                    name="team_staff_username_clean"
                    id="team_staff_username_clean"
                    autoComplete="off"
                    autoCorrect="off"
                    autoCapitalize="off"
                    spellCheck="false"
                    value={newTeamUsername}
                    onChange={(e) => setNewTeamUsername(e.target.value)}
                    placeholder="e.g. staff_member"
                    className="form-input"
                    style={{ width: "100%", padding: "9px 12px", borderRadius: "8px", border: "1px solid var(--border-color)", background: "var(--bg-primary)", color: "var(--text-primary)", fontSize: "13.5px" }}
                    required
                  />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "var(--text-muted)", marginBottom: "6px" }}>
                    Login Password
                  </label>
                  <div style={{ position: "relative" }}>
                    <input
                      type={showTeamPassword ? "text" : "password"}
                      name="team_staff_password_clean"
                      id="team_staff_password_clean"
                      autoComplete="new-password"
                      value={newTeamPassword}
                      onChange={(e) => setNewTeamPassword(e.target.value)}
                      placeholder="Min 4 characters"
                      className="form-input"
                      style={{ width: "100%", padding: "9px 36px 9px 12px", borderRadius: "8px", border: "1px solid var(--border-color)", background: "var(--bg-primary)", color: "var(--text-primary)", fontSize: "13.5px" }}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowTeamPassword(!showTeamPassword)}
                      style={{
                        position: "absolute",
                        right: "10px",
                        top: "50%",
                        transform: "translateY(-50%)",
                        background: "none",
                        border: "none",
                        color: "var(--text-muted)",
                        cursor: "pointer",
                        padding: 0,
                        display: "flex",
                        alignItems: "center",
                      }}
                    >
                      {showTeamPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>
                <div>
                  <button
                    type="submit"
                    disabled={addingTeamMember}
                    className="btn-primary"
                    style={{ width: "100%", padding: "10px 16px", borderRadius: "8px", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", fontSize: "13.5px", fontWeight: 600 }}
                  >
                    <UserPlus size={15} />
                    {addingTeamMember ? "Creating..." : "Create Login"}
                  </button>
                </div>
              </div>
              <p style={{ fontSize: "12px", color: "var(--text-muted)", margin: "10px 0 0", lineHeight: 1.4 }}>
                💡 Team members log in with these credentials. They share your active WhatsApp sending channel, live chats, and campaign assets.
              </p>
            </form>

            {/* List of active team logins */}
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                <h3 style={{ fontSize: "14px", fontWeight: 600, color: "var(--text-primary)", margin: 0 }}>
                  Active Team Logins ({teamMembers.length})
                </h3>
                <button
                  type="button"
                  onClick={loadTeam}
                  disabled={teamLoading}
                  style={{ background: "none", border: "none", color: "var(--accent)", fontSize: "12px", cursor: "pointer", display: "flex", alignItems: "center", gap: "4px" }}
                >
                  <RefreshCw size={12} className={teamLoading ? "animate-spin" : ""} />
                  Refresh
                </button>
              </div>

              {teamLoading && teamMembers.length === 0 ? (
                <div style={{ padding: "24px", textAlign: "center", color: "var(--text-muted)", fontSize: "13px" }}>
                  Loading team logins...
                </div>
              ) : teamMembers.length === 0 ? (
                <div style={{ padding: "32px", textAlign: "center", background: "var(--bg-secondary)", borderRadius: "12px", border: "1px dashed var(--border-color)" }}>
                  <Users size={32} color="var(--text-muted)" style={{ margin: "0 auto 8px", opacity: 0.5 }} />
                  <p style={{ margin: "0 0 4px", fontSize: "13.5px", fontWeight: 600, color: "var(--text-primary)" }}>
                    No Sub-Logins Yet
                  </p>
                  <p style={{ margin: 0, fontSize: "12px", color: "var(--text-muted)" }}>
                    Add staff members using the form above to let multiple people work on this account.
                  </p>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  {teamMembers.map((m) => (
                    <div
                      key={m.id}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        padding: "12px 16px",
                        borderRadius: "10px",
                        background: "var(--bg-secondary)",
                        border: "1px solid var(--border-color)",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                        <div style={{ width: "32px", height: "32px", borderRadius: "50%", background: "rgba(16, 185, 129, 0.12)", color: "#10b981", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: "13px" }}>
                          {m.username.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div style={{ fontSize: "13.5px", fontWeight: 600, color: "var(--text-primary)" }}>
                            {m.username}
                          </div>
                          <div style={{ fontSize: "11px", color: "var(--text-muted)", display: "flex", alignItems: "center", gap: "6px", marginTop: "3px", flexWrap: "wrap" }}>
                            <span>Role: Staff Member</span>
                            <span>•</span>
                            <span style={{ fontWeight: 600 }}>Pass:</span>
                            <span
                              style={{
                                fontFamily: "monospace",
                                color: visibleTeamPasswords[m.id] ? "var(--accent)" : "var(--text-primary)",
                                background: "var(--bg-tertiary)",
                                padding: "1px 6px",
                                borderRadius: "4px",
                                letterSpacing: visibleTeamPasswords[m.id] ? "0.5px" : "1.5px",
                              }}
                            >
                              {visibleTeamPasswords[m.id] ? (m.raw_password || "(not set)") : "••••••••"}
                            </span>
                            <button
                              type="button"
                              onClick={() => setVisibleTeamPasswords((p) => ({ ...p, [m.id]: !p[m.id] }))}
                              title={visibleTeamPasswords[m.id] ? "Hide password" : "Show password"}
                              style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", padding: 0, display: "flex" }}
                            >
                              {visibleTeamPasswords[m.id] ? <EyeOff size={12} /> : <Eye size={12} />}
                            </button>
                            {m.raw_password && (
                              <button
                                type="button"
                                onClick={() => {
                                  navigator.clipboard.writeText(m.raw_password);
                                  showSuccess(`Password for ${m.username} copied!`);
                                }}
                                title="Copy password"
                                style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", padding: 0, display: "flex" }}
                              >
                                <Copy size={12} />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleDeleteTeamMember(m.id, m.username)}
                        title="Delete team login"
                        style={{
                          background: "rgba(239, 68, 68, 0.08)",
                          border: "1px solid rgba(239, 68, 68, 0.2)",
                          color: "#ef4444",
                          borderRadius: "6px",
                          padding: "6px 10px",
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          gap: "4px",
                          fontSize: "12px",
                        }}
                      >
                        <Trash2 size={13} />
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>
        )}

        {/* ========================================================= */}
        {/* TAB 2: ADMIN CREDENTIALS */}
        {/* ========================================================= */}
        {activeTab === "credentials" && (
          <section className="ui-card animate-fade-in" style={{ transform: "none" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "22px" }}>
              <div style={{ width: "42px", height: "42px", borderRadius: "12px", background: "rgba(15, 59, 168, 0.08)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--accent)" }}>
                <UserCog size={22} />
              </div>
              <div>
                <h2 style={{ fontSize: "17px", fontWeight: "700", color: "var(--text-primary)", margin: 0 }}>
                  {isClientView ? "Account Credentials" : "Admin Security & Login"}
                </h2>
                <p style={{ fontSize: "13px", color: "var(--text-muted)", margin: "2px 0 0" }}>
                  {isClientView
                    ? "Update your login username and password"
                    : "Update your administrator login credentials"}
                </p>
              </div>
            </div>

            {error && (
              <div className="window-warning" style={{ marginBottom: "18px" }}>
                <span className="window-warning-text">{error}</span>
              </div>
            )}

            {success && (
              <div style={{ padding: "12px 16px", backgroundColor: "rgba(76, 175, 80, 0.1)", border: "1px solid var(--status-delivered)", borderRadius: "12px", color: "var(--status-delivered)", display: "flex", alignItems: "center", gap: "8px", marginBottom: "18px", fontSize: "13.5px", fontWeight: "500" }}>
                <CheckCircle2 size={18} />
                <span>{success}</span>
              </div>
            )}

            <form onSubmit={handleUpdateProfile}>
              {/* 2-Column Side-by-Side Credentials Grid */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(290px, 1fr))", gap: "18px", marginBottom: "22px" }}>
                {/* Section 1: Current Verification */}
                <div
                  style={{
                    background: "var(--bg-tertiary)",
                    borderRadius: "14px",
                    padding: "18px 20px",
                    border: "1px solid var(--border-color)",
                    display: "flex",
                    flexDirection: "column",
                    gap: "14px",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", paddingBottom: "8px", borderBottom: "1px solid var(--border-color)" }}>
                    <div style={{ width: "24px", height: "24px", borderRadius: "6px", background: "rgba(15, 59, 168, 0.1)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--accent)" }}>
                      <ShieldCheck size={14} />
                    </div>
                    <h3 style={{ fontSize: "12px", fontWeight: "700", color: "var(--text-primary)", textTransform: "uppercase", letterSpacing: "0.5px", margin: 0 }}>
                      Current Verification
                    </h3>
                  </div>

                  <div>
                    <label className="form-label" style={{ fontSize: "12.5px", marginBottom: "6px" }}>Current Username / ID</label>
                    <input
                      type="text"
                      className="form-input"
                      value={currentUsername}
                      onChange={(e) => setCurrentUsername(e.target.value)}
                      placeholder="Enter current username"
                      required
                      style={{ padding: "10px 14px", fontSize: "14px", background: "#ffffff" }}
                    />
                  </div>

                  <div>
                    <label className="form-label" style={{ fontSize: "12.5px", marginBottom: "6px" }}>Current Password</label>
                    <div style={{ position: "relative" }}>
                      <input
                        type={showCurrentPassword ? "text" : "password"}
                        className="form-input"
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        placeholder="Enter current password"
                        required
                        style={{ padding: "10px 14px", paddingRight: "40px", fontSize: "14px", background: "#ffffff" }}
                      />
                      <button
                        type="button"
                        onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                        style={{ position: "absolute", right: "12px", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", display: "flex" }}
                      >
                        {showCurrentPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Section 2: New Credentials */}
                <div
                  style={{
                    background: "var(--bg-tertiary)",
                    borderRadius: "14px",
                    padding: "18px 20px",
                    border: "1px solid var(--border-color)",
                    display: "flex",
                    flexDirection: "column",
                    gap: "14px",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", paddingBottom: "8px", borderBottom: "1px solid var(--border-color)" }}>
                    <div style={{ width: "24px", height: "24px", borderRadius: "6px", background: "rgba(16, 185, 129, 0.12)", display: "flex", alignItems: "center", justifyContent: "center", color: "#059669" }}>
                      <UserCog size={14} />
                    </div>
                    <h3 style={{ fontSize: "12px", fontWeight: "700", color: "var(--text-primary)", textTransform: "uppercase", letterSpacing: "0.5px", margin: 0 }}>
                      New Credentials
                    </h3>
                  </div>

                  <div>
                    <label className="form-label" style={{ fontSize: "12.5px", marginBottom: "6px" }}>New Username / ID</label>
                    <input
                      type="text"
                      className="form-input"
                      value={newUsername}
                      onChange={(e) => setNewUsername(e.target.value)}
                      placeholder="Enter new username"
                      required
                      style={{ padding: "10px 14px", fontSize: "14px", background: "#ffffff" }}
                    />
                  </div>

                  <div>
                    <label className="form-label" style={{ fontSize: "12.5px", marginBottom: "6px" }}>New Password</label>
                    <div style={{ position: "relative" }}>
                      <input
                        type={showNewPassword ? "text" : "password"}
                        className="form-input"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="Min. 6 characters"
                        required
                        style={{ padding: "10px 14px", paddingRight: "40px", fontSize: "14px", background: "#ffffff" }}
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                        style={{ position: "absolute", right: "12px", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", display: "flex" }}
                      >
                        {showNewPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons Bar */}
              <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", paddingTop: "6px", borderTop: "1px solid var(--border-color)" }}>
                <button
                  type="submit"
                  className="btn-primary"
                  style={{
                    padding: "11px 24px",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "8px",
                    fontSize: "13.5px",
                    fontWeight: "600",
                    borderRadius: "10px",
                    cursor: loading ? "not-allowed" : "pointer",
                  }}
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <RefreshCw size={15} className="animate-spin" />
                      <span>Saving changes...</span>
                    </>
                  ) : (
                    <>
                      <Save size={16} />
                      <span>Save &amp; Update Credentials</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </section>
        )}

        {/* ========================================================= */}
        {/* TAB 3: WEBHOOK & API ENDPOINTS (MASTER ADMIN ONLY) */}
        {/* ========================================================= */}
        {!isClientView && activeTab === "webhook" && (
          <section className="ui-card animate-fade-in" style={{ transform: "none" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "20px" }}>
              <div style={{ width: "44px", height: "44px", borderRadius: "12px", background: "var(--accent-glow)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--accent)" }}>
                <Webhook size={22} />
              </div>
              <div>
                <h2 style={{ fontSize: "17px", fontWeight: "700", color: "var(--text-primary)", margin: 0 }}>
                  Meta Webhook Configuration
                </h2>
                <p style={{ fontSize: "13px", color: "var(--text-muted)", margin: "2px 0 0" }}>
                  Endpoints required in Meta for Developers app to receive real-time message updates
                </p>
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              {/* Webhook Callback URL */}
              <div style={{ padding: "14px 16px", background: "var(--bg-tertiary)", borderRadius: "12px", border: "1px solid var(--border-color)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                  <span style={{ fontSize: "12.5px", fontWeight: "600", color: "var(--text-primary)" }}>Callback URL</span>
                  <button
                    type="button"
                    onClick={() => handleCopy(`${(process.env.NEXT_PUBLIC_API_URL || (typeof window !== "undefined" ? window.location.origin : "")).replace(/\/+$/, "")}/webhook`, "webhook")}
                    className="btn-secondary"
                    style={{ fontSize: "11px", padding: "4px 10px", display: "inline-flex", alignItems: "center", gap: "4px" }}
                  >
                    {copiedKey === "webhook" ? <Check size={12} color="green" /> : <Copy size={12} />}
                    <span>{copiedKey === "webhook" ? "Copied" : "Copy"}</span>
                  </button>
                </div>
                <code style={{ fontSize: "13px", color: "var(--accent)", wordBreak: "break-all" }}>
                  {typeof window !== "undefined" ? `${(process.env.NEXT_PUBLIC_API_URL || window.location.origin).replace(/\/+$/, "")}/webhook` : "https://api.yourdomain.com/webhook"}
                </code>
              </div>

              {/* Verify Token */}
              <div style={{ padding: "14px 16px", background: "var(--bg-tertiary)", borderRadius: "12px", border: "1px solid var(--border-color)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                  <span style={{ fontSize: "12.5px", fontWeight: "600", color: "var(--text-primary)" }}>Verify Token</span>
                  <button
                    type="button"
                    onClick={() => handleCopy("assudani_wp_verify_token_2026", "token")}
                    className="btn-secondary"
                    style={{ fontSize: "11px", padding: "4px 10px", display: "inline-flex", alignItems: "center", gap: "4px" }}
                  >
                    {copiedKey === "token" ? <Check size={12} color="green" /> : <Copy size={12} />}
                    <span>{copiedKey === "token" ? "Copied" : "Copy"}</span>
                  </button>
                </div>
                <code style={{ fontSize: "13px", color: "var(--text-primary)" }}>
                  assudani_wp_verify_token_2026
                </code>
              </div>

              {/* Privacy Policy URL */}
              <div style={{ padding: "14px 16px", background: "var(--bg-tertiary)", borderRadius: "12px", border: "1px solid var(--border-color)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                  <span style={{ fontSize: "12.5px", fontWeight: "600", color: "var(--text-primary)" }}>Privacy Policy URL (Meta App Review)</span>
                  <div style={{ display: "flex", gap: "8px" }}>
                    <a
                      href="/privacy"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn-secondary"
                      style={{ fontSize: "11px", padding: "4px 10px", display: "inline-flex", alignItems: "center", gap: "4px", textDecoration: "none" }}
                    >
                      <ExternalLink size={12} />
                      <span>Open</span>
                    </a>
                    <button
                      type="button"
                      onClick={() => handleCopy(typeof window !== "undefined" ? `${window.location.origin}/privacy` : "/privacy", "privacy")}
                      className="btn-secondary"
                      style={{ fontSize: "11px", padding: "4px 10px", display: "inline-flex", alignItems: "center", gap: "4px" }}
                    >
                      {copiedKey === "privacy" ? <Check size={12} color="green" /> : <Copy size={12} />}
                      <span>{copiedKey === "privacy" ? "Copied" : "Copy"}</span>
                    </button>
                  </div>
                </div>
                <code style={{ fontSize: "13px", color: "var(--accent)", wordBreak: "break-all" }}>
                  {typeof window !== "undefined" ? `${window.location.origin}/privacy` : "/privacy"}
                </code>
              </div>

              {/* Webhook Subscriptions Guide */}
              <div style={{ padding: "16px", background: "var(--bg-primary)", borderRadius: "12px", border: "1px solid var(--border-color)" }}>
                <div style={{ fontSize: "13px", fontWeight: "600", marginBottom: "8px", color: "var(--text-primary)" }}>
                  Subscribed Webhook Fields:
                </div>
                <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                  {["messages", "message_template_status_update", "messaging_postbacks", "phone_number_quality_update"].map((field) => (
                    <span key={field} style={{ fontSize: "12px", padding: "4px 10px", background: "var(--accent-glow)", color: "var(--accent)", borderRadius: "6px", fontWeight: "500" }}>
                      ✓ {field}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </section>
        )}

        {/* ========================================================= */}
        {/* TAB 4: SYSTEM & PLATFORM INFO (MASTER ADMIN ONLY) */}
        {/* ========================================================= */}
        {!isClientView && activeTab === "system" && (
          <section className="ui-card animate-fade-in" style={{ transform: "none" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "20px" }}>
              <div style={{ width: "44px", height: "44px", borderRadius: "12px", background: "var(--accent-glow)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--accent)" }}>
                <Server size={22} />
              </div>
              <div>
                <h2 style={{ fontSize: "17px", fontWeight: "700", color: "var(--text-primary)", margin: 0 }}>
                  System Architecture &amp; Platform Info
                </h2>
                <p style={{ fontSize: "13px", color: "var(--text-muted)", margin: "2px 0 0" }}>
                  Deployment environment, database, and real-time socket details
                </p>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "14px" }}>
              <div style={{ padding: "16px", background: "var(--bg-tertiary)", borderRadius: "12px", border: "1px solid var(--border-color)" }}>
                <div style={{ fontSize: "11px", fontWeight: "600", color: "var(--text-muted)", textTransform: "uppercase" }}>Edition</div>
                <div style={{ fontSize: "16px", fontWeight: "700", color: "var(--text-primary)", marginTop: "4px" }}>Assudani WA Automations V3.0 PRO</div>
                <div style={{ fontSize: "12px", color: "var(--secondary-accent)", marginTop: "4px" }}>● Production Active</div>
              </div>

              <div style={{ padding: "16px", background: "var(--bg-tertiary)", borderRadius: "12px", border: "1px solid var(--border-color)" }}>
                <div style={{ fontSize: "11px", fontWeight: "600", color: "var(--text-muted)", textTransform: "uppercase" }}>Real-time Delivery</div>
                <div style={{ fontSize: "16px", fontWeight: "700", color: "var(--text-primary)", marginTop: "4px" }}>Socket.io Engine</div>
                <div style={{ fontSize: "12px", color: "var(--secondary-accent)", marginTop: "4px" }}>● Connected</div>
              </div>

              <div style={{ padding: "16px", background: "var(--bg-tertiary)", borderRadius: "12px", border: "1px solid var(--border-color)" }}>
                <div style={{ fontSize: "11px", fontWeight: "600", color: "var(--text-muted)", textTransform: "uppercase" }}>Storage Engine</div>
                <div style={{ fontSize: "16px", fontWeight: "700", color: "var(--text-primary)", marginTop: "4px" }}>Server Media Library</div>
                <div style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "4px" }}>Permanent disk storage</div>
              </div>

              <div style={{ padding: "16px", background: "var(--bg-tertiary)", borderRadius: "12px", border: "1px solid var(--border-color)" }}>
                <div style={{ fontSize: "11px", fontWeight: "600", color: "var(--text-muted)", textTransform: "uppercase" }}>Cloud API Gateway</div>
                <div style={{ fontSize: "16px", fontWeight: "700", color: "var(--text-primary)", marginTop: "4px" }}>Meta Graph v21.0</div>
                <div style={{ fontSize: "12px", color: "var(--secondary-accent)", marginTop: "4px" }}>● Official WhatsApp Cloud API</div>
              </div>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
