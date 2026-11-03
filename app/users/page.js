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

  // Modal states
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);

  // Form states
  const [formData, setFormData] = useState({
    username: "",
    password: "",
    role: "client",
    whatsapp_mode: "company",
    meta_phone_number_id: "",
    meta_waba_id: "",
    meta_access_token: "",
  });

  const [showPassword, setShowPassword] = useState(false);
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
      whatsapp_mode: "company",
      meta_phone_number_id: "",
      meta_waba_id: "",
      meta_access_token: "",
    });
    setShowPassword(false);
    setMetaTestResult(null);
  };

  const handleOpenCreate = () => {
    resetForm();
    setIsCreateModalOpen(true);
  };

  const handleOpenEdit = (user) => {
    setEditingUser(user);
    setFormData({
      username: user.username,
      password: "", // Leave blank if not changing
      role: user.role || "client",
      whatsapp_mode: user.whatsapp_mode || "company",
      meta_phone_number_id: user.meta_phone_number_id || "",
      meta_waba_id: user.meta_waba_id || "",
      meta_access_token: "", // Don't expose token
    });
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

    setSubmitting(true);
    try {
      await createUser(formData);
      showSuccess(`User "${formData.username}" created successfully!`);
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

    setSubmitting(true);
    try {
      const payload = {
        role: formData.role,
        whatsapp_mode: formData.whatsapp_mode,
        meta_phone_number_id: formData.meta_phone_number_id,
        meta_waba_id: formData.meta_waba_id,
      };

      if (formData.password.trim()) {
        payload.password = formData.password.trim();
      }
      if (formData.meta_access_token.trim()) {
        payload.meta_access_token = formData.meta_access_token.trim();
      }

      await updateUser(editingUser.id, payload);
      showSuccess(`User "${editingUser.username}" updated successfully!`);
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
      showError("Cannot delete the Master Admin account.");
      return;
    }

    if (!confirm(`Are you sure you want to delete user "${user.username}"? This action cannot be undone.`)) {
      return;
    }

    try {
      await deleteUser(user.id);
      showSuccess(`User "${user.username}" deleted successfully.`);
      fetchUsers();
    } catch (err) {
      showError(err.response?.data?.error || "Failed to delete user.");
    }
  };

  const filteredUsers = usersList.filter(
    (u) =>
      u.username?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.role?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.whatsapp_mode?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const stats = {
    total: usersList.length,
    masterAdmin: usersList.filter((u) => u.role === "master_admin").length,
    admins: usersList.filter((u) => u.role === "admin").length,
    clients: usersList.filter((u) => u.role === "client").length,
    companyMode: usersList.filter((u) => u.whatsapp_mode === "company").length,
    personalMode: usersList.filter((u) => u.whatsapp_mode === "personal").length,
  };

  return (
    <div style={{ padding: "28px", maxWidth: "1280px", margin: "0 auto" }}>
      {/* Page Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          marginBottom: "24px",
          flexWrap: "wrap",
          gap: "16px",
        }}
      >
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div
              style={{
                width: "40px",
                height: "40px",
                borderRadius: "10px",
                background: "linear-gradient(135deg, #002277, #2563eb)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#ffffff",
              }}
            >
              <ShieldCheck size={22} />
            </div>
            <div>
              <h1 style={{ fontSize: "24px", fontWeight: 700, margin: 0, color: "var(--text-primary)" }}>
                SaaS Client & User Management
              </h1>
              <p style={{ margin: "4px 0 0", color: "var(--text-muted)", fontSize: "14px" }}>
                Master Admin Portal • Create client accounts & configure WhatsApp sending modes
              </p>
            </div>
          </div>
        </div>

        <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
          <button
            onClick={fetchUsers}
            disabled={loading}
            style={{
              padding: "10px 14px",
              borderRadius: "8px",
              background: "var(--bg-tertiary)",
              border: "1px solid var(--border-color)",
              color: "var(--text-primary)",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "6px",
              fontSize: "14px",
              fontWeight: 500,
            }}
          >
            <RefreshCw size={15} className={loading ? "spin-animation" : ""} />
            Refresh
          </button>
          <button
            onClick={handleOpenCreate}
            style={{
              padding: "10px 18px",
              borderRadius: "8px",
              background: "linear-gradient(135deg, #002277 0%, #1e40af 100%)",
              border: "none",
              color: "#ffffff",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "8px",
              fontSize: "14px",
              fontWeight: 600,
              boxShadow: "0 2px 8px rgba(0, 34, 119, 0.25)",
            }}
          >
            <UserPlus size={16} />
            Add New Client
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))",
          gap: "16px",
          marginBottom: "28px",
        }}
      >
        <div
          style={{
            background: "var(--bg-secondary)",
            border: "1px solid var(--border-color)",
            borderRadius: "12px",
            padding: "18px",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", color: "var(--text-muted)", fontSize: "13px" }}>
            <span>Total Accounts</span>
            <Users size={18} color="#2563eb" />
          </div>
          <div style={{ fontSize: "28px", fontWeight: 700, margin: "8px 0 0", color: "var(--text-primary)" }}>
            {stats.total}
          </div>
          <div style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "4px" }}>
            {stats.clients} clients • {stats.admins + stats.masterAdmin} admins
          </div>
        </div>

        <div
          style={{
            background: "var(--bg-secondary)",
            border: "1px solid var(--border-color)",
            borderRadius: "12px",
            padding: "18px",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", color: "var(--text-muted)", fontSize: "13px" }}>
            <span>Company WhatsApp</span>
            <Building size={18} color="#059669" />
          </div>
          <div style={{ fontSize: "28px", fontWeight: 700, margin: "8px 0 0", color: "#059669" }}>
            {stats.companyMode}
          </div>
          <div style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "4px" }}>
            Using Central Company Channel
          </div>
        </div>

        <div
          style={{
            background: "var(--bg-secondary)",
            border: "1px solid var(--border-color)",
            borderRadius: "12px",
            padding: "18px",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", color: "var(--text-muted)", fontSize: "13px" }}>
            <span>Personal Meta API</span>
            <Smartphone size={18} color="#7c3aed" />
          </div>
          <div style={{ fontSize: "28px", fontWeight: 700, margin: "8px 0 0", color: "#7c3aed" }}>
            {stats.personalMode}
          </div>
          <div style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "4px" }}>
            Client personal WhatsApp numbers
          </div>
        </div>

        <div
          style={{
            background: "var(--bg-secondary)",
            border: "1px solid var(--border-color)",
            borderRadius: "12px",
            padding: "18px",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", color: "var(--text-muted)", fontSize: "13px" }}>
            <span>Current Session</span>
            <Shield size={18} color="#002277" />
          </div>
          <div style={{ fontSize: "18px", fontWeight: 700, margin: "12px 0 0", color: "#002277" }}>
            {currentUser?.username || "Master Admin"}
          </div>
          <div style={{ fontSize: "12px", color: "#059669", marginTop: "4px", fontWeight: 600 }}>
            Master Administrator
          </div>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div
        style={{
          background: "var(--bg-secondary)",
          border: "1px solid var(--border-color)",
          borderRadius: "12px",
          padding: "16px",
          marginBottom: "20px",
          display: "flex",
          gap: "12px",
          alignItems: "center",
        }}
      >
        <Search size={18} color="var(--text-muted)" />
        <input
          type="text"
          placeholder="Search clients by username, role, or WhatsApp mode..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{
            flex: 1,
            background: "transparent",
            border: "none",
            outline: "none",
            color: "var(--text-primary)",
            fontSize: "14px",
          }}
        />
      </div>

      {/* Users Table */}
      <div
        style={{
          background: "var(--bg-secondary)",
          border: "1px solid var(--border-color)",
          borderRadius: "12px",
          overflow: "hidden",
        }}
      >
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "14px" }}>
            <thead>
              <tr style={{ background: "var(--bg-tertiary)", borderBottom: "1px solid var(--border-color)" }}>
                <th style={{ padding: "14px 16px", textAlign: "left", color: "var(--text-muted)", fontWeight: 600 }}>User / Client</th>
                <th style={{ padding: "14px 16px", textAlign: "left", color: "var(--text-muted)", fontWeight: 600 }}>Role</th>
                <th style={{ padding: "14px 16px", textAlign: "left", color: "var(--text-muted)", fontWeight: 600 }}>WhatsApp Sender Mode</th>
                <th style={{ padding: "14px 16px", textAlign: "left", color: "var(--text-muted)", fontWeight: 600 }}>Channel Details</th>
                <th style={{ padding: "14px 16px", textAlign: "left", color: "var(--text-muted)", fontWeight: 600 }}>Status</th>
                <th style={{ padding: "14px 16px", textAlign: "right", color: "var(--text-muted)", fontWeight: 600 }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} style={{ padding: "40px", textAlign: "center", color: "var(--text-muted)" }}>
                    <RefreshCw size={24} className="spin-animation" style={{ margin: "0 auto 8px" }} />
                    <div>Loading users...</div>
                  </td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ padding: "40px", textAlign: "center", color: "var(--text-muted)" }}>
                    No users found matching your search.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => {
                  const isMaster = user.role === "master_admin";
                  const isPersonal = user.whatsapp_mode === "personal";

                  return (
                    <tr
                      key={user.id}
                      style={{
                        borderBottom: "1px solid var(--border-color)",
                        transition: "background 0.15s ease",
                      }}
                    >
                      <td style={{ padding: "14px 16px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                          <div
                            style={{
                              width: "36px",
                              height: "36px",
                              borderRadius: "8px",
                              background: isMaster
                                ? "linear-gradient(135deg, #002277, #7c3aed)"
                                : "var(--bg-tertiary)",
                              color: isMaster ? "#ffffff" : "var(--text-primary)",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              fontWeight: 700,
                              fontSize: "14px",
                            }}
                          >
                            {user.username?.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div style={{ fontWeight: 600, color: "var(--text-primary)" }}>{user.username}</div>
                            <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>
                              ID: {user.id.substring(0, 8)}...
                            </div>
                          </div>
                        </div>
                      </td>

                      <td style={{ padding: "14px 16px" }}>
                        <span
                          style={{
                            display: "inline-block",
                            padding: "4px 10px",
                            borderRadius: "12px",
                            fontSize: "12px",
                            fontWeight: 600,
                            background: isMaster
                              ? "rgba(124, 58, 237, 0.12)"
                              : user.role === "admin"
                              ? "rgba(37, 99, 235, 0.12)"
                              : "rgba(100, 116, 139, 0.12)",
                            color: isMaster ? "#7c3aed" : user.role === "admin" ? "#2563eb" : "#475569",
                            border: `1px solid ${
                              isMaster
                                ? "rgba(124, 58, 237, 0.25)"
                                : user.parent_client_id
                                ? "rgba(16, 185, 129, 0.25)"
                                : "rgba(37, 99, 235, 0.25)"
                            }`,
                          }}
                        >
                          {isMaster
                            ? "👑 Master Admin"
                            : user.parent_client_id
                            ? "👥 Staff Login"
                            : "🏢 Client Org"}
                        </span>
                      </td>

                      <td style={{ padding: "14px 16px" }}>
                        <span
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "5px",
                            padding: "4px 10px",
                            borderRadius: "12px",
                            fontSize: "12px",
                            fontWeight: 600,
                            background: isPersonal ? "rgba(124, 58, 237, 0.1)" : "rgba(5, 150, 105, 0.1)",
                            color: isPersonal ? "#7c3aed" : "#059669",
                            border: `1px solid ${isPersonal ? "rgba(124, 58, 237, 0.2)" : "rgba(5, 150, 105, 0.2)"}`,
                          }}
                        >
                          {isPersonal ? <Smartphone size={13} /> : <Building size={13} />}
                          {isPersonal ? "Personal Meta API" : "Company Number"}
                        </span>
                      </td>

                      <td style={{ padding: "14px 16px", color: "var(--text-secondary)", fontSize: "13px" }}>
                        {isPersonal ? (
                          user.meta_phone_number_id ? (
                            <div>
                              <div style={{ fontWeight: 500, color: "var(--text-primary)" }}>
                                {user.meta_verified_name || "Verified Meta Number"}
                              </div>
                              <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>
                                ID: {user.meta_phone_number_id}
                              </div>
                            </div>
                          ) : (
                            <span style={{ color: "#d97706", fontSize: "12px" }}>⚠️ Setup incomplete</span>
                          )
                        ) : (
                          <div>
                            <div style={{ fontWeight: 500, color: "var(--text-primary)" }}>Company WhatsApp</div>
                            <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>Platform Central Channel</div>
                          </div>
                        )}
                      </td>

                      <td style={{ padding: "14px 16px" }}>
                        <span
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "5px",
                            fontSize: "12px",
                            fontWeight: 600,
                            color: "#059669",
                          }}
                        >
                          <span
                            style={{
                              width: "7px",
                              height: "7px",
                              borderRadius: "50%",
                              background: "#10b981",
                            }}
                          />
                          Active
                        </span>
                      </td>

                      <td style={{ padding: "14px 16px", textAlign: "right" }}>
                        <div style={{ display: "inline-flex", gap: "6px" }}>
                          {!isMaster && (
                            <button
                              onClick={() => {
                                localStorage.setItem("active_client_id", user.id);
                                localStorage.setItem("active_client_name", user.username);
                                localStorage.setItem("active_client_mode", user.whatsapp_mode || "company");
                                router.push("/chat");
                              }}
                              title="Switch into this client's view & workspace"
                              style={{
                                background: "rgba(99, 102, 241, 0.1)",
                                border: "1px solid rgba(99, 102, 241, 0.25)",
                                borderRadius: "6px",
                                padding: "6px 10px",
                                cursor: "pointer",
                                color: "#4f46e5",
                                display: "flex",
                                alignItems: "center",
                                gap: "4px",
                                fontSize: "12px",
                                fontWeight: 600,
                              }}
                            >
                              <Eye size={13} />
                              View
                            </button>
                          )}
                          <button
                            onClick={() => handleOpenEdit(user)}
                            title="Edit User & Credentials"
                            style={{
                              background: "var(--bg-tertiary)",
                              border: "1px solid var(--border-color)",
                              borderRadius: "6px",
                              padding: "6px 10px",
                              cursor: "pointer",
                              color: "var(--text-primary)",
                              display: "flex",
                              alignItems: "center",
                              gap: "4px",
                              fontSize: "12px",
                            }}
                          >
                            <Edit size={13} />
                            Edit
                          </button>
                          {!isMaster && (
                            <button
                              onClick={() => handleDeleteUser(user)}
                              title="Delete Client"
                              style={{
                                background: "rgba(239, 68, 68, 0.1)",
                                border: "1px solid rgba(239, 68, 68, 0.25)",
                                borderRadius: "6px",
                                padding: "6px 10px",
                                cursor: "pointer",
                                color: "#dc2626",
                                display: "flex",
                                alignItems: "center",
                                gap: "4px",
                                fontSize: "12px",
                              }}
                            >
                              <Trash2 size={13} />
                              Delete
                            </button>
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

      {/* CREATE USER MODAL */}
      {isCreateModalOpen && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0, 0, 0, 0.5)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 999,
            padding: "20px",
          }}
        >
          <div
            style={{
              background: "var(--bg-secondary)",
              border: "1px solid var(--border-color)",
              borderRadius: "14px",
              width: "100%",
              maxWidth: "540px",
              boxShadow: "0 20px 40px rgba(0, 0, 0, 0.3)",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                padding: "20px 24px",
                borderBottom: "1px solid var(--border-color)",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <UserPlus size={20} color="#002277" />
                <h3 style={{ margin: 0, fontSize: "18px", fontWeight: 700, color: "var(--text-primary)" }}>
                  Create New Client Account
                </h3>
              </div>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer" }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} style={{ padding: "24px" }}>
              <div style={{ marginBottom: "16px" }}>
                <label style={{ display: "block", fontSize: "13px", fontWeight: 600, marginBottom: "6px", color: "var(--text-primary)" }}>
                  Username / Client ID *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. kapil_enterprises"
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  style={{
                    width: "100%",
                    padding: "10px 12px",
                    borderRadius: "8px",
                    background: "var(--bg-tertiary)",
                    border: "1px solid var(--border-color)",
                    color: "var(--text-primary)",
                    fontSize: "14px",
                  }}
                />
              </div>

              <div style={{ marginBottom: "16px" }}>
                <label style={{ display: "block", fontSize: "13px", fontWeight: 600, marginBottom: "6px", color: "var(--text-primary)" }}>
                  Password *
                </label>
                <div style={{ position: "relative" }}>
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    placeholder="Enter secure initial password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    style={{
                      width: "100%",
                      padding: "10px 40px 10px 12px",
                      borderRadius: "8px",
                      background: "var(--bg-tertiary)",
                      border: "1px solid var(--border-color)",
                      color: "var(--text-primary)",
                      fontSize: "14px",
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
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
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "16px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "13px", fontWeight: 600, marginBottom: "6px", color: "var(--text-primary)" }}>
                    Account Role
                  </label>
                  <select
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                    style={{
                      width: "100%",
                      padding: "10px 12px",
                      borderRadius: "8px",
                      background: "var(--bg-tertiary)",
                      border: "1px solid var(--border-color)",
                      color: "var(--text-primary)",
                      fontSize: "14px",
                    }}
                  >
                    <option value="client">Client Organization</option>
                    <option value="user">Sub-Login (Staff under Client)</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "13px", fontWeight: 600, marginBottom: "6px", color: "var(--text-primary)" }}>
                    WhatsApp Sender Channel
                  </label>
                  <select
                    value={formData.whatsapp_mode}
                    onChange={(e) => setFormData({ ...formData, whatsapp_mode: e.target.value })}
                    style={{
                      width: "100%",
                      padding: "10px 12px",
                      borderRadius: "8px",
                      background: "var(--bg-tertiary)",
                      border: "1px solid var(--border-color)",
                      color: "var(--text-primary)",
                      fontSize: "14px",
                    }}
                  >
                    <option value="company">🏢 Company Default WhatsApp Channel</option>
                    <option value="personal">📱 Personal Meta API (BYO Key)</option>
                  </select>
                </div>
              </div>

              {formData.role === "user" && (
                <div style={{ marginBottom: "16px" }}>
                  <label style={{ display: "block", fontSize: "13px", fontWeight: 600, marginBottom: "6px", color: "var(--text-primary)" }}>
                    Parent Client Organization
                  </label>
                  <select
                    value={formData.parent_client_id || ""}
                    onChange={(e) => setFormData({ ...formData, parent_client_id: e.target.value })}
                    style={{
                      width: "100%",
                      padding: "10px 12px",
                      borderRadius: "8px",
                      background: "var(--bg-tertiary)",
                      border: "1px solid var(--border-color)",
                      color: "var(--text-primary)",
                      fontSize: "14px",
                    }}
                    required
                  >
                    <option value="">-- Select Parent Client --</option>
                    {users
                      .filter((u) => u.role === "client" || (!u.parent_client_id && u.role !== "master_admin"))
                      .map((client) => (
                        <option key={client.id} value={client.id}>
                          {client.username}
                        </option>
                      ))}
                  </select>
                </div>
              )}

              {/* Personal Meta API Credentials Section */}
              {formData.whatsapp_mode === "personal" && (
                <div
                  style={{
                    background: "rgba(124, 58, 237, 0.05)",
                    border: "1px solid rgba(124, 58, 237, 0.2)",
                    borderRadius: "10px",
                    padding: "16px",
                    marginBottom: "16px",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px", color: "#7c3aed" }}>
                    <Smartphone size={16} />
                    <span style={{ fontSize: "13px", fontWeight: 700 }}>Personal Meta API Credentials</span>
                  </div>

                  <div style={{ marginBottom: "12px" }}>
                    <label style={{ display: "block", fontSize: "12px", fontWeight: 600, marginBottom: "4px" }}>
                      WhatsApp Phone Number ID
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. 1404154399449473"
                      value={formData.meta_phone_number_id}
                      onChange={(e) => setFormData({ ...formData, meta_phone_number_id: e.target.value })}
                      style={{
                        width: "100%",
                        padding: "8px 10px",
                        borderRadius: "6px",
                        background: "var(--bg-tertiary)",
                        border: "1px solid var(--border-color)",
                        color: "var(--text-primary)",
                        fontSize: "13px",
                      }}
                    />
                  </div>

                  <div style={{ marginBottom: "12px" }}>
                    <label style={{ display: "block", fontSize: "12px", fontWeight: 600, marginBottom: "4px" }}>
                      WhatsApp Business Account ID (WABA ID)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. 1915831806460496"
                      value={formData.meta_waba_id}
                      onChange={(e) => setFormData({ ...formData, meta_waba_id: e.target.value })}
                      style={{
                        width: "100%",
                        padding: "8px 10px",
                        borderRadius: "6px",
                        background: "var(--bg-tertiary)",
                        border: "1px solid var(--border-color)",
                        color: "var(--text-primary)",
                        fontSize: "13px",
                      }}
                    />
                  </div>

                  <div style={{ marginBottom: "12px" }}>
                    <label style={{ display: "block", fontSize: "12px", fontWeight: 600, marginBottom: "4px" }}>
                      Permanent System User Access Token
                    </label>
                    <input
                      type="password"
                      placeholder="EAAVBwoAGBZBg..."
                      value={formData.meta_access_token}
                      onChange={(e) => setFormData({ ...formData, meta_access_token: e.target.value })}
                      style={{
                        width: "100%",
                        padding: "8px 10px",
                        borderRadius: "6px",
                        background: "var(--bg-tertiary)",
                        border: "1px solid var(--border-color)",
                        color: "var(--text-primary)",
                        fontSize: "13px",
                      }}
                    />
                  </div>

                  <button
                    type="button"
                    onClick={handleTestMeta}
                    disabled={testingMeta}
                    style={{
                      padding: "6px 12px",
                      borderRadius: "6px",
                      background: "rgba(124, 58, 237, 0.15)",
                      border: "1px solid rgba(124, 58, 237, 0.3)",
                      color: "#7c3aed",
                      cursor: "pointer",
                      fontSize: "12px",
                      fontWeight: 600,
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                    }}
                  >
                    <Zap size={13} />
                    {testingMeta ? "Verifying with Meta..." : "Test Meta Connection"}
                  </button>

                  {metaTestResult && (
                    <div
                      style={{
                        marginTop: "10px",
                        fontSize: "12px",
                        color: metaTestResult.success ? "#059669" : "#dc2626",
                        fontWeight: 500,
                      }}
                    >
                      {metaTestResult.message}
                    </div>
                  )}
                </div>
              )}

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "20px" }}>
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  style={{
                    padding: "10px 16px",
                    borderRadius: "8px",
                    background: "var(--bg-tertiary)",
                    border: "1px solid var(--border-color)",
                    color: "var(--text-primary)",
                    cursor: "pointer",
                    fontSize: "14px",
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  style={{
                    padding: "10px 20px",
                    borderRadius: "8px",
                    background: "linear-gradient(135deg, #002277 0%, #1e40af 100%)",
                    border: "none",
                    color: "#ffffff",
                    cursor: "pointer",
                    fontSize: "14px",
                    fontWeight: 600,
                  }}
                >
                  {submitting ? "Creating..." : "Create Client Account"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT USER MODAL */}
      {isEditModalOpen && editingUser && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0, 0, 0, 0.5)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 999,
            padding: "20px",
          }}
        >
          <div
            style={{
              background: "var(--bg-secondary)",
              border: "1px solid var(--border-color)",
              borderRadius: "14px",
              width: "100%",
              maxWidth: "540px",
              boxShadow: "0 20px 40px rgba(0, 0, 0, 0.3)",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                padding: "20px 24px",
                borderBottom: "1px solid var(--border-color)",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <Edit size={20} color="#002277" />
                <h3 style={{ margin: 0, fontSize: "18px", fontWeight: 700, color: "var(--text-primary)" }}>
                  Edit User: {editingUser.username}
                </h3>
              </div>
              <button
                onClick={() => setIsEditModalOpen(false)}
                style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer" }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} style={{ padding: "24px" }}>
              <div style={{ marginBottom: "16px" }}>
                <label style={{ display: "block", fontSize: "13px", fontWeight: 600, marginBottom: "6px", color: "var(--text-primary)" }}>
                  New Password (leave blank to keep current)
                </label>
                <div style={{ position: "relative" }}>
                  <input
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter new password (optional)"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    style={{
                      width: "100%",
                      padding: "10px 40px 10px 12px",
                      borderRadius: "8px",
                      background: "var(--bg-tertiary)",
                      border: "1px solid var(--border-color)",
                      color: "var(--text-primary)",
                      fontSize: "14px",
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
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
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "16px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "13px", fontWeight: 600, marginBottom: "6px", color: "var(--text-primary)" }}>
                    Account Role
                  </label>
                  <select
                    value={formData.role}
                    disabled={editingUser.role === "master_admin"}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                    style={{
                      width: "100%",
                      padding: "10px 12px",
                      borderRadius: "8px",
                      background: "var(--bg-tertiary)",
                      border: "1px solid var(--border-color)",
                      color: "var(--text-primary)",
                      fontSize: "14px",
                    }}
                  >
                    <option value="client">Client Organization</option>
                    <option value="user">Sub-Login (Staff under Client)</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "13px", fontWeight: 600, marginBottom: "6px", color: "var(--text-primary)" }}>
                    WhatsApp Sender Channel
                  </label>
                  <select
                    value={formData.whatsapp_mode}
                    onChange={(e) => setFormData({ ...formData, whatsapp_mode: e.target.value })}
                    style={{
                      width: "100%",
                      padding: "10px 12px",
                      borderRadius: "8px",
                      background: "var(--bg-tertiary)",
                      border: "1px solid var(--border-color)",
                      color: "var(--text-primary)",
                      fontSize: "14px",
                    }}
                  >
                    <option value="company">🏢 Company Default WhatsApp Channel</option>
                    <option value="personal">📱 Personal Meta API (BYO Key)</option>
                  </select>
                </div>
              </div>

              {formData.role === "user" && (
                <div style={{ marginBottom: "16px" }}>
                  <label style={{ display: "block", fontSize: "13px", fontWeight: 600, marginBottom: "6px", color: "var(--text-primary)" }}>
                    Parent Client Organization
                  </label>
                  <select
                    value={formData.parent_client_id || ""}
                    onChange={(e) => setFormData({ ...formData, parent_client_id: e.target.value })}
                    style={{
                      width: "100%",
                      padding: "10px 12px",
                      borderRadius: "8px",
                      background: "var(--bg-tertiary)",
                      border: "1px solid var(--border-color)",
                      color: "var(--text-primary)",
                      fontSize: "14px",
                    }}
                    required
                  >
                    <option value="">-- Select Parent Client --</option>
                    {users
                      .filter((u) => u.role === "client" || (!u.parent_client_id && u.role !== "master_admin"))
                      .map((client) => (
                        <option key={client.id} value={client.id}>
                          {client.username}
                        </option>
                      ))}
                  </select>
                </div>
              )}

              {formData.whatsapp_mode === "personal" && (
                <div
                  style={{
                    background: "rgba(124, 58, 237, 0.05)",
                    border: "1px solid rgba(124, 58, 237, 0.2)",
                    borderRadius: "10px",
                    padding: "16px",
                    marginBottom: "16px",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px", color: "#7c3aed" }}>
                    <Smartphone size={16} />
                    <span style={{ fontSize: "13px", fontWeight: 700 }}>Personal Meta API Credentials</span>
                  </div>

                  <div style={{ marginBottom: "12px" }}>
                    <label style={{ display: "block", fontSize: "12px", fontWeight: 600, marginBottom: "4px" }}>
                      WhatsApp Phone Number ID
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. 1404154399449473"
                      value={formData.meta_phone_number_id}
                      onChange={(e) => setFormData({ ...formData, meta_phone_number_id: e.target.value })}
                      style={{
                        width: "100%",
                        padding: "8px 10px",
                        borderRadius: "6px",
                        background: "var(--bg-tertiary)",
                        border: "1px solid var(--border-color)",
                        color: "var(--text-primary)",
                        fontSize: "13px",
                      }}
                    />
                  </div>

                  <div style={{ marginBottom: "12px" }}>
                    <label style={{ display: "block", fontSize: "12px", fontWeight: 600, marginBottom: "4px" }}>
                      WhatsApp Business Account ID (WABA ID)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. 1915831806460496"
                      value={formData.meta_waba_id}
                      onChange={(e) => setFormData({ ...formData, meta_waba_id: e.target.value })}
                      style={{
                        width: "100%",
                        padding: "8px 10px",
                        borderRadius: "6px",
                        background: "var(--bg-tertiary)",
                        border: "1px solid var(--border-color)",
                        color: "var(--text-primary)",
                        fontSize: "13px",
                      }}
                    />
                  </div>

                  <div style={{ marginBottom: "12px" }}>
                    <label style={{ display: "block", fontSize: "12px", fontWeight: 600, marginBottom: "4px" }}>
                      New Access Token (leave empty to keep current)
                    </label>
                    <input
                      type="password"
                      placeholder="Paste new token only if updating"
                      value={formData.meta_access_token}
                      onChange={(e) => setFormData({ ...formData, meta_access_token: e.target.value })}
                      style={{
                        width: "100%",
                        padding: "8px 10px",
                        borderRadius: "6px",
                        background: "var(--bg-tertiary)",
                        border: "1px solid var(--border-color)",
                        color: "var(--text-primary)",
                        fontSize: "13px",
                      }}
                    />
                  </div>

                  {formData.meta_access_token && (
                    <button
                      type="button"
                      onClick={handleTestMeta}
                      disabled={testingMeta}
                      style={{
                        padding: "6px 12px",
                        borderRadius: "6px",
                        background: "rgba(124, 58, 237, 0.15)",
                        border: "1px solid rgba(124, 58, 237, 0.3)",
                        color: "#7c3aed",
                        cursor: "pointer",
                        fontSize: "12px",
                        fontWeight: 600,
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                      }}
                    >
                      <Zap size={13} />
                      {testingMeta ? "Verifying with Meta..." : "Test Meta Connection"}
                    </button>
                  )}
                </div>
              )}

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "20px" }}>
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  style={{
                    padding: "10px 16px",
                    borderRadius: "8px",
                    background: "var(--bg-tertiary)",
                    border: "1px solid var(--border-color)",
                    color: "var(--text-primary)",
                    cursor: "pointer",
                    fontSize: "14px",
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  style={{
                    padding: "10px 20px",
                    borderRadius: "8px",
                    background: "linear-gradient(135deg, #002277 0%, #1e40af 100%)",
                    border: "none",
                    color: "#ffffff",
                    cursor: "pointer",
                    fontSize: "14px",
                    fontWeight: 600,
                  }}
                >
                  {submitting ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
