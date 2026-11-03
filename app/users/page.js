"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Users,
  UserPlus,
  ShieldCheck,
  Shield,
  Key,
  Smartphone,
  CheckCircle2,
  AlertCircle,
  Trash2,
  Edit,
  RefreshCw,
  Search,
  ExternalLink,
  Building,
  Zap,
  Lock,
  Eye,
  EyeOff,
  X,
  Layers,
  Check,
  Sparkles,
  ArrowRight,
  UserCheck,
  Copy,
} from "lucide-react";
import api, { getUsers, createUser, updateUser, deleteUser, testMetaCredentials } from "../lib/api";
import { useToast } from "../components/ToastProvider";

export default function UsersManagementPage() {
  const router = useRouter();
  const { showSuccess, showError } = useToast();

  const [currentUser, setCurrentUser] = useState(null);
  const [usersList, setUsersList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");

  // Modal states
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);

  // Password visibility map for table rows
  const [visiblePasswords, setVisiblePasswords] = useState({});
  const togglePasswordVisibility = (userId) => {
    setVisiblePasswords((prev) => ({ ...prev, [userId]: !prev[userId] }));
  };

  // Form states
  const [formData, setFormData] = useState({
    username: "",
    password: "",
    role: "client",
    parent_client_id: "",
    status: "active",
    whatsapp_mode: "company",
    meta_phone_number_id: "",
    meta_waba_id: "",
    meta_access_token: "",
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showEditPassword, setShowEditPassword] = useState(false);
  const [testingMeta, setTestingMeta] = useState(false);
  const [metaTestResult, setMetaTestResult] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    // Check authentication and role
    const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
    const userJson = typeof window !== "undefined" ? localStorage.getItem("user") : null;
    const role = typeof window !== "undefined" ? localStorage.getItem("user_role") : null;

    if (!token) {
      router.push("/login");
      return;
    }

    if (userJson) {
      try {
        const u = JSON.parse(userJson);
        setCurrentUser(u);
        const isMaster = role === "master_admin" || u?.role === "master_admin" || u?.username?.toLowerCase() === "piyushassudani";
        if (!isMaster) {
          router.push("/chat");
          return;
        }
      } catch (e) {}
    }

    fetchUsers();
  }, [router]);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await getUsers();
      setUsersList(res.data.users || []);
    } catch (err) {
      console.error("Fetch users error:", err);
      const msg = err.response?.data?.error || "Failed to load users list.";
      showError(msg);
      if (err.response?.status === 403) {
        router.push("/chat");
      }
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      username: "",
      password: "",
      role: "client",
      parent_client_id: "",
      status: "active",
      whatsapp_mode: "company",
      meta_phone_number_id: "",
      meta_waba_id: "",
      meta_access_token: "",
    });
    setShowPassword(false);
    setShowEditPassword(false);
    setMetaTestResult(null);
  };

  const handleOpenCreate = () => {
    resetForm();
    setIsCreateModalOpen(true);
  };

  const handleOpenEdit = (user) => {
    setEditingUser(user);
    setFormData({
      username: user.username || "",
      password: user.raw_password || "",
      role: user.role || "client",
      parent_client_id: user.parent_client_id || "",
      status: user.status || "active",
      whatsapp_mode: user.whatsapp_mode || "company",
      meta_phone_number_id: user.meta_phone_number_id || "",
      meta_waba_id: user.meta_waba_id || "",
      meta_access_token: user.meta_access_token || "",
    });
    setShowEditPassword(false);
    setMetaTestResult(null);
    setIsEditModalOpen(true);
  };

  const handleTestMeta = async () => {
    if (!formData.meta_phone_number_id || !formData.meta_access_token) {
      showError("Please enter both Phone Number ID and Access Token to test.");
      return;
    }

    setTestingMeta(true);
    setMetaTestResult(null);

    try {
      const res = await testMetaCredentials({
        phone_number_id: formData.meta_phone_number_id,
        access_token: formData.meta_access_token,
      });

      if (res.data?.success) {
        setMetaTestResult({
          success: true,
          data: res.data.data,
          message: `Verified: ${res.data.data.verified_name || "Active"} (${res.data.data.display_phone_number || "Meta OK"})`,
        });
        showSuccess("Meta credentials verified successfully!");
      } else {
        setMetaTestResult({ success: false, message: res.data?.error || "Verification failed" });
        showError(res.data?.error || "Verification failed");
      }
    } catch (err) {
      const errDetail = err.response?.data?.error || err.message;
      setMetaTestResult({ success: false, message: errDetail });
      showError(`Meta verification failed: ${errDetail}`);
    } finally {
      setTestingMeta(false);
    }
  };

  const handleCreateSubmit = async (e) => {
    e.preventDefault();

    if (!formData.username.trim() || !formData.password.trim()) {
      showError("Username and password are required.");
      return;
    }

    if (formData.password.length < 4) {
      showError("Password must be at least 4 characters long.");
      return;
    }

    if (formData.role === "user" && !formData.parent_client_id) {
      showError("Please select a parent client organization for this staff sub-login.");
      return;
    }

    setSubmitting(true);
    try {
      await createUser(formData);
      showSuccess(`Account "${formData.username}" created successfully!`);
      setIsCreateModalOpen(false);
      resetForm();
      fetchUsers();
    } catch (err) {
      showError(err.response?.data?.error || "Failed to create user.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!editingUser) return;

    if (!formData.username.trim()) {
      showError("Username cannot be empty.");
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        username: formData.username.trim(),
        role: formData.role,
        parent_client_id: formData.parent_client_id || null,
        status: formData.status || "active",
        whatsapp_mode: formData.whatsapp_mode,
        meta_phone_number_id: formData.meta_phone_number_id ? formData.meta_phone_number_id.trim() : null,
        meta_waba_id: formData.meta_waba_id ? formData.meta_waba_id.trim() : null,
      };

      if (formData.password.trim()) {
        payload.password = formData.password.trim();
      }
      if (formData.meta_access_token.trim()) {
        payload.meta_access_token = formData.meta_access_token.trim();
      }

      await updateUser(editingUser.id, payload);
      showSuccess(`Account "${formData.username.trim()}" updated successfully!`);
      setIsEditModalOpen(false);
      setEditingUser(null);
      resetForm();
      fetchUsers();
    } catch (err) {
      showError(err.response?.data?.error || "Failed to update user.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteUser = async (user) => {
    if (user.role === "master_admin") {
      showError("Master Admin cannot be deleted.");
      return;
    }

    const isConfirmed = window.confirm(
      `Are you sure you want to permanently delete user "${user.username}"? This action cannot be undone.`
    );

    if (!isConfirmed) return;

    try {
      await deleteUser(user.id);
      showSuccess(`User "${user.username}" deleted successfully.`);
      fetchUsers();
    } catch (err) {
      showError(err.response?.data?.error || "Failed to delete user.");
    }
  };

  // Helper map for finding parent client names
  const clientMap = {};
  usersList.forEach((u) => {
    clientMap[u.id] = u.username;
  });

  const clientOrgs = usersList.filter(
    (u) => u.role === "client" || (!u.parent_client_id && u.role !== "master_admin")
  );
  const staffUsers = usersList.filter((u) => !!u.parent_client_id);
  const companyUsers = usersList.filter((u) => u.whatsapp_mode === "company");
  const personalUsers = usersList.filter((u) => u.whatsapp_mode === "personal");

  const filteredUsers = usersList.filter((u) => {
    // Search query match
    const q = searchQuery.toLowerCase().trim();
    const matchQuery =
      !q ||
      u.username?.toLowerCase().includes(q) ||
      u.role?.toLowerCase().includes(q) ||
      u.whatsapp_mode?.toLowerCase().includes(q) ||
      (clientMap[u.parent_client_id] && clientMap[u.parent_client_id].toLowerCase().includes(q));

    if (!matchQuery) return false;

    // Category filter
    if (categoryFilter === "clients") {
      return u.role === "client" || (!u.parent_client_id && u.role !== "master_admin");
    }
    if (categoryFilter === "staff") {
      return !!u.parent_client_id;
    }
    if (categoryFilter === "company") {
      return u.whatsapp_mode === "company";
    }
    if (categoryFilter === "personal") {
      return u.whatsapp_mode === "personal";
    }
    return true;
  });

  const handleSwitchToClient = (user) => {
    localStorage.setItem("active_client_id", user.id);
    localStorage.setItem("active_client_name", user.username);
    localStorage.setItem("active_client_mode", user.whatsapp_mode || "company");
    showSuccess(`Switched context to client workspace: ${user.username}`);
    router.push("/chat");
  };

  return (
    <div style={{ height: "100%", overflowY: "auto", width: "100%" }}>
      <div className="users-page-container" style={{ padding: "28px 32px", maxWidth: "1360px", margin: "0 auto", width: "100%" }}>
      {/* Top Header Card */}
      <div
        style={{
          background: "#ffffff",
          border: "1px solid rgba(226, 232, 240, 0.8)",
          borderRadius: "16px",
          padding: "24px 28px",
          marginBottom: "24px",
          boxShadow: "0 4px 20px -2px rgba(0, 34, 119, 0.04), 0 1px 3px rgba(0, 0, 0, 0.02)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "18px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <div
            style={{
              width: "48px",
              height: "48px",
              borderRadius: "14px",
              background: "linear-gradient(135deg, #002277 0%, #1e40af 100%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#ffffff",
              boxShadow: "0 8px 16px -3px rgba(0, 34, 119, 0.28)",
            }}
          >
            <ShieldCheck size={26} strokeWidth={2.2} />
          </div>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
              <h1 style={{ fontSize: "22px", fontWeight: 800, margin: 0, color: "#090d16", letterSpacing: "-0.02em" }}>
                Client &amp; Organization Management
              </h1>
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "5px",
                  padding: "3px 10px",
                  borderRadius: "20px",
                  fontSize: "11px",
                  fontWeight: 700,
                  background: "rgba(16, 185, 129, 0.1)",
                  color: "#059669",
                  border: "1px solid rgba(16, 185, 129, 0.25)",
                }}
              >
                <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#10b981", boxShadow: "0 0 6px #10b981" }} />
                Master Admin Portal
              </span>
            </div>
            <p style={{ margin: 0, color: "#64748b", fontSize: "13.5px" }}>
              Manage isolated client workspaces, team sub-logins, and Meta WhatsApp Cloud API credentials
            </p>
          </div>
        </div>

        <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
          <button
            onClick={fetchUsers}
            disabled={loading}
            style={{
              padding: "10px 16px",
              borderRadius: "10px",
              background: "#ffffff",
              border: "1px solid #e2e8f0",
              color: "#334155",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "8px",
              fontSize: "13.5px",
              fontWeight: 600,
              boxShadow: "0 1px 2px rgba(0, 0, 0, 0.04)",
              transition: "all 0.15s ease",
            }}
          >
            <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
            Refresh
          </button>
          <button
            onClick={handleOpenCreate}
            style={{
              padding: "10px 20px",
              borderRadius: "10px",
              background: "linear-gradient(135deg, #002277 0%, #1e40af 100%)",
              border: "none",
              color: "#ffffff",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "8px",
              fontSize: "13.5px",
              fontWeight: 600,
              boxShadow: "0 4px 12px rgba(0, 34, 119, 0.25)",
              transition: "transform 0.15s ease, box-shadow 0.15s ease",
            }}
          >
            <UserPlus size={16} />
            Add New Client / User
          </button>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: "16px",
          marginBottom: "24px",
        }}
      >
        {/* KPI 1 */}
        <div
          style={{
            background: "#ffffff",
            border: "1px solid rgba(226, 232, 240, 0.8)",
            borderRadius: "14px",
            padding: "20px 22px",
            boxShadow: "0 2px 8px rgba(0, 0, 0, 0.02)",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: "13px", fontWeight: 600, color: "#64748b" }}>Total Accounts</span>
            <div style={{ width: "36px", height: "36px", borderRadius: "10px", background: "rgba(37, 99, 235, 0.08)", display: "flex", alignItems: "center", justifyContent: "center", color: "#2563eb" }}>
              <Users size={18} />
            </div>
          </div>
          <div style={{ fontSize: "30px", fontWeight: 800, margin: "10px 0 2px", color: "#090d16" }}>
            {usersList.length}
          </div>
          <div style={{ fontSize: "12.5px", color: "#64748b", display: "flex", alignItems: "center", gap: "6px" }}>
            <span style={{ fontWeight: 600, color: "#2563eb" }}>{clientOrgs.length} clients</span>
            <span>•</span>
            <span>{staffUsers.length} staff logins</span>
          </div>
        </div>

        {/* KPI 2 */}
        <div
          style={{
            background: "#ffffff",
            border: "1px solid rgba(226, 232, 240, 0.8)",
            borderRadius: "14px",
            padding: "20px 22px",
            boxShadow: "0 2px 8px rgba(0, 0, 0, 0.02)",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: "13px", fontWeight: 600, color: "#64748b" }}>Client Organizations</span>
            <div style={{ width: "36px", height: "36px", borderRadius: "10px", background: "rgba(5, 150, 105, 0.08)", display: "flex", alignItems: "center", justifyContent: "center", color: "#059669" }}>
              <Building size={18} />
            </div>
          </div>
          <div style={{ fontSize: "30px", fontWeight: 800, margin: "10px 0 2px", color: "#059669" }}>
            {clientOrgs.length}
          </div>
          <div style={{ fontSize: "12.5px", color: "#64748b" }}>
            Fully isolated customer workspaces
          </div>
        </div>

        {/* KPI 3 */}
        <div
          style={{
            background: "#ffffff",
            border: "1px solid rgba(226, 232, 240, 0.8)",
            borderRadius: "14px",
            padding: "20px 22px",
            boxShadow: "0 2px 8px rgba(0, 0, 0, 0.02)",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: "13px", fontWeight: 600, color: "#64748b" }}>Personal Meta API</span>
            <div style={{ width: "36px", height: "36px", borderRadius: "10px", background: "rgba(124, 58, 237, 0.08)", display: "flex", alignItems: "center", justifyContent: "center", color: "#7c3aed" }}>
              <Smartphone size={18} />
            </div>
          </div>
          <div style={{ fontSize: "30px", fontWeight: 800, margin: "10px 0 2px", color: "#7c3aed" }}>
            {personalUsers.length}
          </div>
          <div style={{ fontSize: "12.5px", color: "#64748b" }}>
            Dedicated client WABA numbers
          </div>
        </div>

        {/* KPI 4 */}
        <div
          style={{
            background: "#ffffff",
            border: "1px solid rgba(226, 232, 240, 0.8)",
            borderRadius: "14px",
            padding: "20px 22px",
            boxShadow: "0 2px 8px rgba(0, 0, 0, 0.02)",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: "13px", fontWeight: 600, color: "#64748b" }}>Platform Central Number</span>
            <div style={{ width: "36px", height: "36px", borderRadius: "10px", background: "rgba(15, 59, 168, 0.08)", display: "flex", alignItems: "center", justifyContent: "center", color: "#002277" }}>
              <Shield size={18} />
            </div>
          </div>
          <div style={{ fontSize: "30px", fontWeight: 800, margin: "10px 0 2px", color: "#002277" }}>
            {companyUsers.length}
          </div>
          <div style={{ fontSize: "12.5px", color: "#64748b" }}>
            Accounts routed via shared channel
          </div>
        </div>
      </div>

      {/* Toolbar: Search + Filter Tabs */}
      <div
        style={{
          background: "#ffffff",
          border: "1px solid rgba(226, 232, 240, 0.8)",
          borderRadius: "14px",
          padding: "12px 18px",
          marginBottom: "18px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "12px",
          boxShadow: "0 2px 6px rgba(0, 0, 0, 0.02)",
        }}
      >
        {/* Search */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "10px",
            background: "#f8fafc",
            border: "1px solid #e2e8f0",
            borderRadius: "10px",
            padding: "8px 14px",
            minWidth: "280px",
            flex: 1,
            maxWidth: "420px",
          }}
        >
          <Search size={16} color="#94a3b8" />
          <input
            type="text"
            placeholder="Search accounts, client name, role..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              border: "none",
              outline: "none",
              background: "transparent",
              color: "#0f172a",
              fontSize: "13.5px",
              width: "100%",
            }}
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              style={{ background: "none", border: "none", cursor: "pointer", color: "#94a3b8", padding: 0 }}
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* Filter Pills */}
        <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
          {[
            { id: "all", label: "All Accounts", count: usersList.length },
            { id: "clients", label: "Clients", count: clientOrgs.length },
            { id: "staff", label: "Staff Logins", count: staffUsers.length },
            { id: "company", label: "Company Channel", count: companyUsers.length },
            { id: "personal", label: "Personal Meta", count: personalUsers.length },
          ].map((tab) => {
            const isActive = categoryFilter === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setCategoryFilter(tab.id)}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  padding: "7px 14px",
                  borderRadius: "8px",
                  fontSize: "12.5px",
                  fontWeight: isActive ? 700 : 500,
                  background: isActive ? "#002277" : "#f1f5f9",
                  color: isActive ? "#ffffff" : "#475569",
                  border: "none",
                  cursor: "pointer",
                  transition: "all 0.15s ease",
                }}
              >
                <span>{tab.label}</span>
                <span
                  style={{
                    padding: "1px 6px",
                    borderRadius: "10px",
                    fontSize: "11px",
                    background: isActive ? "rgba(255, 255, 255, 0.22)" : "rgba(0, 0, 0, 0.08)",
                  }}
                >
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main SaaS Accounts Table */}
      <div
        style={{
          background: "#ffffff",
          border: "1px solid rgba(226, 232, 240, 0.8)",
          borderRadius: "16px",
          boxShadow: "0 4px 20px -2px rgba(0, 34, 119, 0.04)",
          overflow: "hidden",
        }}
      >
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13.5px" }}>
            <thead>
              <tr style={{ background: "#f8fafc", borderBottom: "1px solid #e2e8f0" }}>
                <th style={{ padding: "14px 20px", textAlign: "left", color: "#64748b", fontWeight: 700, fontSize: "11.5px", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  User / Client Account
                </th>
                <th style={{ padding: "14px 18px", textAlign: "left", color: "#64748b", fontWeight: 700, fontSize: "11.5px", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  Account Hierarchy
                </th>
                <th style={{ padding: "14px 18px", textAlign: "left", color: "#64748b", fontWeight: 700, fontSize: "11.5px", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  WhatsApp Channel Mode
                </th>
                <th style={{ padding: "14px 18px", textAlign: "left", color: "#64748b", fontWeight: 700, fontSize: "11.5px", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  Channel Details
                </th>
                <th style={{ padding: "14px 18px", textAlign: "left", color: "#64748b", fontWeight: 700, fontSize: "11.5px", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  Status
                </th>
                <th style={{ padding: "14px 20px", textAlign: "right", color: "#64748b", fontWeight: 700, fontSize: "11.5px", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} style={{ padding: "50px", textAlign: "center", color: "#64748b" }}>
                    <RefreshCw size={24} className="animate-spin" style={{ margin: "0 auto 10px", color: "#002277" }} />
                    <div style={{ fontWeight: 600 }}>Loading SaaS accounts...</div>
                  </td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ padding: "60px 20px", textAlign: "center" }}>
                    <div style={{ width: "48px", height: "48px", borderRadius: "50%", background: "#f1f5f9", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 12px", color: "#94a3b8" }}>
                      <Users size={22} />
                    </div>
                    <div style={{ fontWeight: 700, fontSize: "15px", color: "#0f172a", marginBottom: "4px" }}>
                      No accounts found
                    </div>
                    <div style={{ color: "#64748b", fontSize: "13px" }}>
                      Try adjusting your search terms or filter selection.
                    </div>
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => {
                  const isMaster = user.role === "master_admin" || user.username?.toLowerCase() === "piyushassudani";
                  const isStaff = !!user.parent_client_id;
                  const isPersonal = user.whatsapp_mode === "personal";
                  const parentOrgName = user.parent_client_id ? clientMap[user.parent_client_id] : null;

                  return (
                    <tr
                      key={user.id}
                      style={{
                        borderBottom: "1px solid #f1f5f9",
                        transition: "background 0.15s ease",
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = "#f8fafc")}
                      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                    >
                      {/* User / Client Account */}
                      <td style={{ padding: "16px 20px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                          <div
                            style={{
                              width: "38px",
                              height: "38px",
                              borderRadius: "10px",
                              background: isMaster
                                ? "linear-gradient(135deg, #002277, #7c3aed)"
                                : isStaff
                                ? "linear-gradient(135deg, #059669, #10b981)"
                                : "linear-gradient(135deg, #1e40af, #3b82f6)",
                              color: "#ffffff",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              fontWeight: 800,
                              fontSize: "14px",
                              boxShadow: "0 2px 6px rgba(0, 0, 0, 0.08)",
                              flexShrink: 0,
                            }}
                          >
                            {user.username?.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div style={{ fontWeight: 700, color: "#0f172a", fontSize: "14px" }}>
                              {user.username}
                            </div>
                            <div style={{ fontSize: "11px", color: "#94a3b8", display: "flex", alignItems: "center", gap: "6px", marginTop: "2px" }}>
                              <span style={{ fontFamily: "monospace" }}>ID: {user.id?.substring(0, 8)}...</span>
                              {user.created_at && (
                                <>
                                  <span>•</span>
                                  <span>{new Date(user.created_at).toLocaleDateString()}</span>
                                </>
                              )}
                            </div>
                            {/* Password Badge with Show/Hide & Copy */}
                            <div style={{ display: "flex", alignItems: "center", gap: "6px", marginTop: "4px" }}>
                              <span style={{ fontSize: "11px", fontWeight: 700, color: "#64748b" }}>Pass:</span>
                              <span
                                style={{
                                  fontFamily: "monospace",
                                  fontSize: "12px",
                                  fontWeight: 600,
                                  color: visiblePasswords[user.id] ? "#1e40af" : "#64748b",
                                  background: visiblePasswords[user.id] ? "rgba(37, 99, 235, 0.08)" : "#f1f5f9",
                                  border: visiblePasswords[user.id] ? "1px solid rgba(37, 99, 235, 0.2)" : "1px solid #e2e8f0",
                                  padding: "1px 7px",
                                  borderRadius: "5px",
                                  letterSpacing: visiblePasswords[user.id] ? "0.5px" : "1.5px",
                                }}
                              >
                                {visiblePasswords[user.id] ? (user.raw_password || "(not set)") : "••••••••"}
                              </span>
                              <button
                                type="button"
                                onClick={() => togglePasswordVisibility(user.id)}
                                title={visiblePasswords[user.id] ? "Hide Password" : "Show Password"}
                                style={{
                                  background: "none",
                                  border: "none",
                                  cursor: "pointer",
                                  color: visiblePasswords[user.id] ? "#2563eb" : "#64748b",
                                  padding: "2px",
                                  display: "flex",
                                  alignItems: "center",
                                }}
                              >
                                {visiblePasswords[user.id] ? <EyeOff size={13} /> : <Eye size={13} />}
                              </button>
                              {user.raw_password && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    navigator.clipboard.writeText(user.raw_password);
                                    showSuccess(`Password for ${user.username} copied!`);
                                  }}
                                  title="Copy Password"
                                  style={{
                                    background: "none",
                                    border: "none",
                                    cursor: "pointer",
                                    color: "#64748b",
                                    padding: "2px",
                                    display: "flex",
                                    alignItems: "center",
                                  }}
                                >
                                  <Copy size={13} />
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Account Hierarchy */}
                      <td style={{ padding: "16px 18px" }}>
                        {isMaster ? (
                          <span
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "6px",
                              padding: "4px 10px",
                              borderRadius: "20px",
                              fontSize: "12px",
                              fontWeight: 700,
                              background: "rgba(124, 58, 237, 0.1)",
                              color: "#7c3aed",
                              border: "1px solid rgba(124, 58, 237, 0.25)",
                            }}
                          >
                            👑 Master Admin
                          </span>
                        ) : isStaff ? (
                          <div>
                            <span
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "5px",
                                padding: "4px 10px",
                                borderRadius: "20px",
                                fontSize: "12px",
                                fontWeight: 700,
                                background: "rgba(16, 185, 129, 0.1)",
                                color: "#059669",
                                border: "1px solid rgba(16, 185, 129, 0.25)",
                              }}
                            >
                              👥 Staff Sub-Login
                            </span>
                            {parentOrgName && (
                              <div style={{ fontSize: "11px", color: "#64748b", marginTop: "3px" }}>
                                under <strong>{parentOrgName}</strong>
                              </div>
                            )}
                          </div>
                        ) : (
                          <span
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "6px",
                              padding: "4px 10px",
                              borderRadius: "20px",
                              fontSize: "12px",
                              fontWeight: 700,
                              background: "rgba(37, 99, 235, 0.1)",
                              color: "#2563eb",
                              border: "1px solid rgba(37, 99, 235, 0.25)",
                            }}
                          >
                            🏢 Client Organization
                          </span>
                        )}
                      </td>

                      {/* WhatsApp Channel Mode */}
                      <td style={{ padding: "16px 18px" }}>
                        <span
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "6px",
                            padding: "4px 10px",
                            borderRadius: "8px",
                            fontSize: "12px",
                            fontWeight: 600,
                            background: isPersonal ? "rgba(124, 58, 237, 0.08)" : "rgba(5, 150, 105, 0.08)",
                            color: isPersonal ? "#7c3aed" : "#059669",
                            border: `1px solid ${isPersonal ? "rgba(124, 58, 237, 0.2)" : "rgba(5, 150, 105, 0.2)"}`,
                          }}
                        >
                          {isPersonal ? <Smartphone size={13} /> : <Building size={13} />}
                          {isPersonal ? "Personal Meta API" : "Company Number"}
                        </span>
                      </td>

                      {/* Channel Details */}
                      <td style={{ padding: "16px 18px", color: "#475569", fontSize: "13px" }}>
                        {isPersonal ? (
                          user.meta_phone_number_id ? (
                            <div>
                              <div style={{ fontWeight: 600, color: "#0f172a" }}>
                                {user.meta_verified_name || "Verified Meta Account"}
                              </div>
                              <div style={{ fontSize: "11px", color: "#64748b" }}>
                                {user.meta_display_phone_number || `ID: ${user.meta_phone_number_id}`}
                              </div>
                            </div>
                          ) : (
                            <span style={{ color: "#d97706", fontSize: "12px", fontWeight: 500 }}>
                              ⚠️ Pending Credentials
                            </span>
                          )
                        ) : (
                          <div>
                            <div style={{ fontWeight: 600, color: "#0f172a" }}>Company Channel</div>
                            <div style={{ fontSize: "11px", color: "#64748b" }}>Platform Central Sender</div>
                          </div>
                        )}
                      </td>

                      {/* Status */}
                      <td style={{ padding: "16px 18px" }}>
                        <span
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "6px",
                            fontSize: "12px",
                            fontWeight: 700,
                            color: "#059669",
                          }}
                        >
                          <span
                            style={{
                              width: "7px",
                              height: "7px",
                              borderRadius: "50%",
                              background: "#10b981",
                              boxShadow: "0 0 6px rgba(16, 185, 129, 0.6)",
                            }}
                          />
                          Active
                        </span>
                      </td>

                      {/* Actions */}
                      <td style={{ padding: "16px 20px", textAlign: "right" }}>
                        <div style={{ display: "inline-flex", gap: "6px", alignItems: "center" }}>
                          {!isMaster ? (
                            <>
                              <button
                                onClick={() => handleSwitchToClient(user)}
                                title="Open this client's isolated workspace"
                                style={{
                                  background: "rgba(99, 102, 241, 0.08)",
                                  border: "1px solid rgba(99, 102, 241, 0.25)",
                                  borderRadius: "8px",
                                  padding: "6px 12px",
                                  cursor: "pointer",
                                  color: "#4f46e5",
                                  display: "flex",
                                  alignItems: "center",
                                  gap: "5px",
                                  fontSize: "12px",
                                  fontWeight: 700,
                                  transition: "all 0.15s ease",
                                }}
                              >
                                <Eye size={13} />
                                View Workspace
                              </button>
                              <button
                                onClick={() => handleOpenEdit(user)}
                                title="Edit user settings"
                                style={{
                                  background: "#f8fafc",
                                  border: "1px solid #e2e8f0",
                                  borderRadius: "8px",
                                  padding: "6px 10px",
                                  cursor: "pointer",
                                  color: "#334155",
                                  display: "flex",
                                  alignItems: "center",
                                  gap: "4px",
                                  fontSize: "12px",
                                  fontWeight: 600,
                                }}
                              >
                                <Edit size={13} />
                                Edit
                              </button>
                              <button
                                onClick={() => handleDeleteUser(user)}
                                title="Delete account"
                                style={{
                                  background: "rgba(239, 68, 68, 0.08)",
                                  border: "1px solid rgba(239, 68, 68, 0.2)",
                                  borderRadius: "8px",
                                  padding: "6px 10px",
                                  cursor: "pointer",
                                  color: "#dc2626",
                                  display: "flex",
                                  alignItems: "center",
                                  gap: "4px",
                                  fontSize: "12px",
                                  fontWeight: 600,
                                }}
                              >
                                <Trash2 size={13} />
                              </button>
                            </>
                          ) : (
                            <span
                              style={{
                                fontSize: "11.5px",
                                color: "#94a3b8",
                                fontStyle: "italic",
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "4px",
                              }}
                            >
                              <Shield size={12} />
                              Master Root
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* CREATE MODAL */}
      {isCreateModalOpen && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(9, 13, 22, 0.6)",
            backdropFilter: "blur(8px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
            padding: "20px",
          }}
        >
          <div
            style={{
              background: "#ffffff",
              border: "1px solid #e2e8f0",
              borderRadius: "18px",
              width: "100%",
              maxWidth: "540px",
              boxShadow: "0 24px 48px -12px rgba(0, 34, 119, 0.25)",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                padding: "20px 24px",
                borderBottom: "1px solid #e2e8f0",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                background: "#f8fafc",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <div style={{ width: "36px", height: "36px", borderRadius: "10px", background: "rgba(0, 34, 119, 0.08)", color: "#002277", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <UserPlus size={18} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: "16px", fontWeight: 800, color: "#090d16" }}>
                    Provision New SaaS Account
                  </h3>
                  <p style={{ margin: 0, fontSize: "12px", color: "#64748b" }}>
                    Create client organization or team sub-login
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                style={{ background: "none", border: "none", cursor: "pointer", color: "#94a3b8" }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} style={{ padding: "24px" }}>
              <div style={{ marginBottom: "16px" }}>
                <label style={{ display: "block", fontSize: "13px", fontWeight: 700, marginBottom: "6px", color: "#090d16" }}>
                  Account Username
                </label>
                <input
                  type="text"
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  placeholder="e.g. client_username"
                  required
                  style={{
                    width: "100%",
                    padding: "10px 14px",
                    borderRadius: "10px",
                    background: "#f8fafc",
                    border: "1px solid #e2e8f0",
                    color: "#0f172a",
                    fontSize: "14px",
                  }}
                />
              </div>

              <div style={{ marginBottom: "16px" }}>
                <label style={{ display: "block", fontSize: "13px", fontWeight: 700, marginBottom: "6px", color: "#090d16" }}>
                  Login Password
                </label>
                <div style={{ position: "relative" }}>
                  <input
                    type={showPassword ? "text" : "password"}
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    placeholder="Min 4 characters"
                    required
                    style={{
                      width: "100%",
                      padding: "10px 40px 10px 14px",
                      borderRadius: "10px",
                      background: "#f8fafc",
                      border: "1px solid #e2e8f0",
                      color: "#0f172a",
                      fontSize: "14px",
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    style={{
                      position: "absolute",
                      right: "12px",
                      top: "50%",
                      transform: "translateY(-50%)",
                      background: "none",
                      border: "none",
                      color: "#94a3b8",
                      cursor: "pointer",
                    }}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px", marginBottom: "16px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "13px", fontWeight: 700, marginBottom: "6px", color: "#090d16" }}>
                    Account Type
                  </label>
                  <select
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                    style={{
                      width: "100%",
                      padding: "10px 12px",
                      borderRadius: "10px",
                      background: "#f8fafc",
                      border: "1px solid #e2e8f0",
                      color: "#0f172a",
                      fontSize: "13.5px",
                      fontWeight: 600,
                    }}
                  >
                    <option value="client">🏢 Client Organization</option>
                    <option value="user">👥 Staff Sub-Login</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "13px", fontWeight: 700, marginBottom: "6px", color: "#090d16" }}>
                    Sending Channel
                  </label>
                  <select
                    value={formData.whatsapp_mode}
                    onChange={(e) => setFormData({ ...formData, whatsapp_mode: e.target.value })}
                    style={{
                      width: "100%",
                      padding: "10px 12px",
                      borderRadius: "10px",
                      background: "#f8fafc",
                      border: "1px solid #e2e8f0",
                      color: "#0f172a",
                      fontSize: "13.5px",
                      fontWeight: 600,
                    }}
                  >
                    <option value="company">🏢 Company Default Channel</option>
                    <option value="personal">📱 Personal Meta API Key</option>
                  </select>
                </div>
              </div>

              {formData.role === "user" && (
                <div style={{ marginBottom: "18px", padding: "12px", background: "rgba(16, 185, 129, 0.05)", borderRadius: "10px", border: "1px solid rgba(16, 185, 129, 0.2)" }}>
                  <label style={{ display: "block", fontSize: "12.5px", fontWeight: 700, marginBottom: "6px", color: "#059669" }}>
                    Select Parent Client Organization
                  </label>
                  <select
                    value={formData.parent_client_id}
                    onChange={(e) => setFormData({ ...formData, parent_client_id: e.target.value })}
                    required
                    style={{
                      width: "100%",
                      padding: "10px 12px",
                      borderRadius: "8px",
                      background: "#ffffff",
                      border: "1px solid #e2e8f0",
                      color: "#0f172a",
                      fontSize: "13.5px",
                    }}
                  >
                    <option value="">-- Choose Client --</option>
                    {clientOrgs.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.username}
                      </option>
                    ))}
                  </select>
                  <p style={{ margin: "6px 0 0", fontSize: "11.5px", color: "#64748b" }}>
                    This staff login will share all contacts, chats, and sending channel of the selected client.
                  </p>
                </div>
              )}

              {/* Personal Meta Details */}
              {formData.whatsapp_mode === "personal" && (
                <div style={{ marginBottom: "18px", padding: "14px", background: "rgba(124, 58, 237, 0.04)", borderRadius: "12px", border: "1px solid rgba(124, 58, 237, 0.2)" }}>
                  <div style={{ fontSize: "13px", fontWeight: 700, color: "#7c3aed", marginBottom: "10px" }}>
                    Personal Meta Cloud API Credentials
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                    <input
                      type="text"
                      placeholder="Phone Number ID"
                      value={formData.meta_phone_number_id}
                      onChange={(e) => setFormData({ ...formData, meta_phone_number_id: e.target.value })}
                      style={{ width: "100%", padding: "8px 12px", borderRadius: "8px", border: "1px solid #e2e8f0", fontSize: "13px" }}
                    />
                    <input
                      type="text"
                      placeholder="WABA ID (Optional)"
                      value={formData.meta_waba_id}
                      onChange={(e) => setFormData({ ...formData, meta_waba_id: e.target.value })}
                      style={{ width: "100%", padding: "8px 12px", borderRadius: "8px", border: "1px solid #e2e8f0", fontSize: "13px" }}
                    />
                    <textarea
                      placeholder="System User Access Token (EAAG...)"
                      rows={2}
                      value={formData.meta_access_token}
                      onChange={(e) => setFormData({ ...formData, meta_access_token: e.target.value })}
                      style={{ width: "100%", padding: "8px 12px", borderRadius: "8px", border: "1px solid #e2e8f0", fontSize: "13px", resize: "none" }}
                    />
                  </div>
                </div>
              )}

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "24px" }}>
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  style={{
                    padding: "10px 16px",
                    borderRadius: "10px",
                    background: "#f1f5f9",
                    border: "none",
                    color: "#475569",
                    fontWeight: 600,
                    fontSize: "13.5px",
                    cursor: "pointer",
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  style={{
                    padding: "10px 22px",
                    borderRadius: "10px",
                    background: "linear-gradient(135deg, #002277 0%, #1e40af 100%)",
                    border: "none",
                    color: "#ffffff",
                    fontWeight: 700,
                    fontSize: "13.5px",
                    cursor: "pointer",
                    boxShadow: "0 4px 12px rgba(0, 34, 119, 0.25)",
                  }}
                >
                  {submitting ? "Creating..." : "Create Account"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT MODAL */}
      {isEditModalOpen && editingUser && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(9, 13, 22, 0.6)",
            backdropFilter: "blur(8px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
            padding: "20px",
          }}
        >
          <div
            style={{
              background: "#ffffff",
              border: "1px solid #e2e8f0",
              borderRadius: "18px",
              width: "100%",
              maxWidth: "580px",
              maxHeight: "90vh",
              boxShadow: "0 24px 48px -12px rgba(0, 34, 119, 0.25)",
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                padding: "20px 24px",
                borderBottom: "1px solid #e2e8f0",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                background: "#f8fafc",
                flexShrink: 0,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <div style={{ width: "36px", height: "36px", borderRadius: "10px", background: "rgba(0, 34, 119, 0.08)", color: "#002277", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Edit size={18} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: "16px", fontWeight: 800, color: "#090d16" }}>
                    Edit Account: {editingUser.username}
                  </h3>
                  <p style={{ margin: 0, fontSize: "12px", color: "#64748b" }}>
                    Update username, password, permissions, and WhatsApp channels
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsEditModalOpen(false)}
                style={{ background: "none", border: "none", cursor: "pointer", color: "#94a3b8" }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} style={{ padding: "24px", overflowY: "auto", flex: 1 }}>
              {/* Username Input */}
              <div style={{ marginBottom: "16px" }}>
                <label style={{ display: "block", fontSize: "13px", fontWeight: 700, marginBottom: "6px", color: "#090d16" }}>
                  Account Username / Login Handle
                </label>
                <input
                  type="text"
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  placeholder="e.g. client_username"
                  required
                  style={{
                    width: "100%",
                    padding: "10px 14px",
                    borderRadius: "10px",
                    background: "#f8fafc",
                    border: "1px solid #e2e8f0",
                    color: "#0f172a",
                    fontSize: "14px",
                    fontWeight: 600,
                  }}
                />
              </div>

              {/* Password Input with Show/Hide & Copy */}
              <div style={{ marginBottom: "16px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                  <label style={{ fontSize: "13px", fontWeight: 700, color: "#090d16", margin: 0 }}>
                    Login Password
                  </label>
                  {formData.password && (
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(formData.password);
                        showSuccess("Password copied to clipboard!");
                      }}
                      style={{
                        background: "none",
                        border: "none",
                        color: "#2563eb",
                        fontSize: "12px",
                        fontWeight: 600,
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: "4px",
                        padding: 0,
                      }}
                    >
                      <Copy size={12} />
                      Copy Password
                    </button>
                  )}
                </div>
                <div style={{ position: "relative" }}>
                  <input
                    type={showEditPassword ? "text" : "password"}
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    placeholder="Enter new password or leave current"
                    style={{
                      width: "100%",
                      padding: "10px 40px 10px 14px",
                      borderRadius: "10px",
                      background: "#f8fafc",
                      border: "1px solid #e2e8f0",
                      color: "#0f172a",
                      fontSize: "14px",
                      fontFamily: showEditPassword ? "inherit" : "monospace",
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowEditPassword(!showEditPassword)}
                    title={showEditPassword ? "Hide password" : "Show password"}
                    style={{
                      position: "absolute",
                      right: "12px",
                      top: "50%",
                      transform: "translateY(-50%)",
                      background: "none",
                      border: "none",
                      color: "#94a3b8",
                      cursor: "pointer",
                      padding: 0,
                      display: "flex",
                      alignItems: "center",
                    }}
                  >
                    {showEditPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                <p style={{ margin: "4px 0 0", fontSize: "11.5px", color: "#64748b" }}>
                  💡 Current password is shown. You can view it anytime or type a new one to update.
                </p>
              </div>

              {/* Role & Status Grid */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px", marginBottom: "16px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "13px", fontWeight: 700, marginBottom: "6px", color: "#090d16" }}>
                    Account Role
                  </label>
                  <select
                    value={formData.role}
                    disabled={editingUser.role === "master_admin"}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                    style={{
                      width: "100%",
                      padding: "10px 12px",
                      borderRadius: "10px",
                      background: editingUser.role === "master_admin" ? "#f1f5f9" : "#f8fafc",
                      border: "1px solid #e2e8f0",
                      color: "#0f172a",
                      fontSize: "13px",
                      fontWeight: 600,
                    }}
                  >
                    <option value="client">🏢 Client Organization</option>
                    <option value="admin">🛡️ Administrator</option>
                    <option value="user">👥 Staff / Sub-Login</option>
                    {editingUser.role === "master_admin" && (
                      <option value="master_admin">👑 Master Admin (Permanent)</option>
                    )}
                  </select>
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "13px", fontWeight: 700, marginBottom: "6px", color: "#090d16" }}>
                    Account Status
                  </label>
                  <select
                    value={formData.status}
                    disabled={editingUser.role === "master_admin"}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    style={{
                      width: "100%",
                      padding: "10px 12px",
                      borderRadius: "10px",
                      background: "#f8fafc",
                      border: "1px solid #e2e8f0",
                      color: "#0f172a",
                      fontSize: "13px",
                      fontWeight: 600,
                    }}
                  >
                    <option value="active">🟢 Active</option>
                    <option value="inactive">🔴 Inactive / Suspended</option>
                  </select>
                </div>
              </div>

              {/* Parent Client Selector (if role is user/staff) */}
              {formData.role === "user" && (
                <div style={{ marginBottom: "16px" }}>
                  <label style={{ display: "block", fontSize: "13px", fontWeight: 700, marginBottom: "6px", color: "#090d16" }}>
                    Assigned Parent Client
                  </label>
                  <select
                    value={formData.parent_client_id}
                    onChange={(e) => setFormData({ ...formData, parent_client_id: e.target.value })}
                    style={{
                      width: "100%",
                      padding: "10px 12px",
                      borderRadius: "10px",
                      background: "#f8fafc",
                      border: "1px solid #e2e8f0",
                      color: "#0f172a",
                      fontSize: "13px",
                      fontWeight: 600,
                    }}
                  >
                    <option value="">-- Select Parent Organization --</option>
                    {clientOrgs.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.username}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* WhatsApp Sender Mode */}
              <div style={{ marginBottom: "16px" }}>
                <label style={{ display: "block", fontSize: "13px", fontWeight: 700, marginBottom: "6px", color: "#090d16" }}>
                  WhatsApp Sender Mode
                </label>
                <select
                  value={formData.whatsapp_mode}
                  onChange={(e) => setFormData({ ...formData, whatsapp_mode: e.target.value })}
                  style={{
                    width: "100%",
                    padding: "10px 12px",
                    borderRadius: "10px",
                    background: "#f8fafc",
                    border: "1px solid #e2e8f0",
                    color: "#0f172a",
                    fontSize: "13.5px",
                    fontWeight: 600,
                  }}
                >
                  <option value="company">🏢 Company Platform WhatsApp (+91 82339 57004)</option>
                  <option value="personal">📱 Personal Meta Cloud API Key</option>
                </select>
              </div>

              {/* Personal Meta Credentials Section */}
              {formData.whatsapp_mode === "personal" && (
                <div style={{ marginBottom: "18px", padding: "16px", background: "rgba(124, 58, 237, 0.04)", borderRadius: "12px", border: "1px solid rgba(124, 58, 237, 0.2)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                    <div style={{ fontSize: "13px", fontWeight: 700, color: "#7c3aed" }}>
                      Personal Meta Cloud API Credentials
                    </div>
                    <button
                      type="button"
                      onClick={handleTestMeta}
                      disabled={testingMeta}
                      style={{
                        padding: "5px 12px",
                        borderRadius: "8px",
                        background: "#7c3aed",
                        border: "none",
                        color: "#ffffff",
                        fontSize: "12px",
                        fontWeight: 600,
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                      }}
                    >
                      <Zap size={12} className={testingMeta ? "animate-spin" : ""} />
                      {testingMeta ? "Testing..." : "Test Connection"}
                    </button>
                  </div>

                  {metaTestResult && (
                    <div
                      style={{
                        padding: "8px 12px",
                        borderRadius: "8px",
                        marginBottom: "12px",
                        fontSize: "12px",
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                        background: metaTestResult.success ? "rgba(16, 185, 129, 0.12)" : "rgba(239, 68, 68, 0.12)",
                        color: metaTestResult.success ? "#059669" : "#dc2626",
                        border: `1px solid ${metaTestResult.success ? "rgba(16, 185, 129, 0.3)" : "rgba(239, 68, 68, 0.3)"}`,
                      }}
                    >
                      {metaTestResult.success ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />}
                      <span>{metaTestResult.message}</span>
                    </div>
                  )}

                  <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                    <div>
                      <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#475569", marginBottom: "4px" }}>
                        Phone Number ID
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. 1404154399449473"
                        value={formData.meta_phone_number_id}
                        onChange={(e) => setFormData({ ...formData, meta_phone_number_id: e.target.value })}
                        style={{ width: "100%", padding: "8px 12px", borderRadius: "8px", border: "1px solid #e2e8f0", fontSize: "13px", background: "#ffffff" }}
                      />
                    </div>

                    <div>
                      <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#475569", marginBottom: "4px" }}>
                        WABA ID (WhatsApp Business Account ID)
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. 1915831806460496"
                        value={formData.meta_waba_id}
                        onChange={(e) => setFormData({ ...formData, meta_waba_id: e.target.value })}
                        style={{ width: "100%", padding: "8px 12px", borderRadius: "8px", border: "1px solid #e2e8f0", fontSize: "13px", background: "#ffffff" }}
                      />
                    </div>

                    <div>
                      <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#475569", marginBottom: "4px" }}>
                        Permanent Access Token
                      </label>
                      <textarea
                        placeholder="Paste EAAB... Meta Permanent Access Token"
                        rows={2}
                        value={formData.meta_access_token}
                        onChange={(e) => setFormData({ ...formData, meta_access_token: e.target.value })}
                        style={{ width: "100%", padding: "8px 12px", borderRadius: "8px", border: "1px solid #e2e8f0", fontSize: "13px", resize: "none", background: "#ffffff" }}
                      />
                    </div>
                  </div>
                </div>
              )}

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "24px" }}>
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  style={{
                    padding: "10px 16px",
                    borderRadius: "10px",
                    background: "#f1f5f9",
                    border: "none",
                    color: "#475569",
                    fontWeight: 600,
                    fontSize: "13.5px",
                    cursor: "pointer",
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  style={{
                    padding: "10px 22px",
                    borderRadius: "10px",
                    background: "linear-gradient(135deg, #002277 0%, #1e40af 100%)",
                    border: "none",
                    color: "#ffffff",
                    fontWeight: 700,
                    fontSize: "13.5px",
                    cursor: "pointer",
                    boxShadow: "0 4px 12px rgba(0, 34, 119, 0.25)",
                  }}
                >
                  {submitting ? "Saving..." : "Save All Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      </div>
    </div>
  );
}
