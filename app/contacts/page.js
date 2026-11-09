"use client";

import { useState, useEffect, useRef } from "react";
import { Upload, Users, FileSpreadsheet, X, CheckCircle2, Trash2, Plus, Filter } from "lucide-react";
import Link from "next/link";
import api, { deleteContactList } from "../lib/api";
import { getSocket } from "../lib/socket";
import { format } from "date-fns";
import { useToast } from "../components/ToastProvider";

export default function ContactsPage() {
  const { showSuccess, showError } = useToast();
  const [lists, setLists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showManualModal, setShowManualModal] = useState(false);
  const [manualListName, setManualListName] = useState("");

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
  
  
  const fileInputRef = useRef(null);
  const [listName, setListName] = useState("");
  const [file, setFile] = useState(null);
  const [dragover, setDragover] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadStep, setUploadStep] = useState("");
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const fetchLists = async () => {
    try {
      const params = {};
      if (selectedClientId && selectedClientId !== "all") {
        params.client_id = selectedClientId;
      }
      const res = await api.get("/api/contact_lists", { params });
      setLists(res.data || []);
    } catch (err) {
      console.error("Failed to fetch contact lists:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLists();
  }, [selectedClientId]);

  // Real-time socket updates for contact lists
  useEffect(() => {
    const socket = getSocket();
    const handleUpdate = () => fetchLists();

    const handleCreated = (data) => {
      if (data?.list) {
        setLists((prev) => {
          if (prev.some((l) => l.id === data.list.id)) return prev;
          return [data.list, ...prev];
        });
      } else {
        fetchLists();
      }
    };

    const handleDeleted = (data) => {
      if (data?.id) {
        setLists((prev) => prev.filter((l) => l.id !== data.id));
      } else {
        fetchLists();
      }
    };

    socket.on("contact_list_created", handleCreated);
    socket.on("contact_list_deleted", handleDeleted);
    socket.on("contact_list_updated", handleUpdate);
    socket.on("contact_updated", handleUpdate);
    socket.on("campaign_progress", handleUpdate);

    return () => {
      socket.off("contact_list_created", handleCreated);
      socket.off("contact_list_deleted", handleDeleted);
      socket.off("contact_list_updated", handleUpdate);
      socket.off("contact_updated", handleUpdate);
      socket.off("campaign_progress", handleUpdate);
    };
  }, []);

  const handleDeleteList = async (id) => {
    if (!confirm("Are you sure you want to delete this entire contact list? All contacts in this list will also be removed.")) return;
    try {
      await deleteContactList(id);
      setLists(lists.filter(l => l.id !== id));
      showSuccess("Contact list deleted successfully.");
    } catch (err) {
      console.error(err);
      showError(err.response?.data?.error || "Failed to delete contact list");
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragover(false);
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) validateAndSetFile(droppedFile);
  };

  const handleFileSelect = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) validateAndSetFile(selectedFile);
  };

  const validateAndSetFile = (f) => {
    if (!f.name.match(/\.(xlsx|xls|csv)$/i)) {
      setError("Only Excel (.xlsx, .xls) and CSV files are allowed");
      return;
    }
    setFile(f);
    setError(null);
    
    if (!listName) {
      setListName(f.name.replace(/\.[^/.]+$/, ""));
    }
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!listName.trim() || !file) {
      setError("Please provide a name and select a file");
      return;
    }

    setUploading(true);
    setUploadStep("Reading spreadsheet & analyzing rows...");
    setUploadProgress(25);
    setError(null);

    const stepTimer1 = setTimeout(() => {
      setUploadStep("Auto-detecting phone numbers, names & columns...");
      setUploadProgress(60);
    }, 400);

    const stepTimer2 = setTimeout(() => {
      setUploadStep("Fast bulk syncing contacts to database...");
      setUploadProgress(85);
    }, 900);

    try {
      const formData = new FormData();
      formData.append("name", listName.trim());
      formData.append("file", file);

      const res = await api.post("/api/contact_lists", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      clearTimeout(stepTimer1);
      clearTimeout(stepTimer2);
      setUploadProgress(100);
      setUploadStep("Contact list synced successfully!");

      const memberCount = res.data?.list?.member_count || 0;
      showSuccess(`List "${listName.trim()}" created with ${memberCount} contacts!`);

      if (res.data?.list) {
        setLists((prev) => {
          if (prev.some((l) => l.id === res.data.list.id)) return prev;
          return [res.data.list, ...prev];
        });
      }
      
      setTimeout(() => {
        setShowUploadModal(false);
        setUploading(false);
        setUploadStep("");
        setUploadProgress(0);
        setFile(null);
        setListName("");
        fetchLists();
      }, 500);
    } catch (err) {
      clearTimeout(stepTimer1);
      clearTimeout(stepTimer2);
      setUploading(false);
      setUploadStep("");
      setUploadProgress(0);
      const errMsg = err.response?.data?.error || "Failed to upload and save list.";
      setError(errMsg);
      showError(errMsg);
    }
  };

  const handleManualCreate = async (e) => {
    e.preventDefault();
    if (!manualListName.trim()) {
      setError("Please provide a name for the list");
      return;
    }

    setUploading(true);
    setUploadStep("Creating empty list...");
    setError(null);

    try {
      const res = await api.post("/api/contact_lists/manual", { name: manualListName.trim() });
      showSuccess(`List "${manualListName.trim()}" created successfully!`);
      
      if (res.data?.list) {
        setLists((prev) => {
          if (prev.some((l) => l.id === res.data.list.id)) return prev;
          return [res.data.list, ...prev];
        });
      }

      setShowManualModal(false);
      setManualListName("");
      fetchLists();
    } catch (err) {
      setError(err.response?.data?.error || "Failed to create list");
      showError(err.response?.data?.error || "Failed to create list");
    } finally {
      setUploading(false);
      setUploadStep("");
    }
  };

  return (
    <div className="page-container">
      <div className="page-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px" }}>
        <div>
          <h1 className="page-title" style={{ margin: 0 }}>Contact Lists</h1>
          <p style={{ color: "var(--text-secondary)", fontSize: "14px", marginTop: "4px" }}>
            Manage saved contact sheets and Excel lists.
          </p>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
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

          <button 
            className="btn-secondary" 
            onClick={() => setShowManualModal(true)}
          >
            <Plus size={18} />
            Create Empty List
          </button>
          <button 
            className="btn-primary" 
            onClick={() => setShowUploadModal(true)}
          >
            <Upload size={18} />
            Upload New Sheet
          </button>
        </div>
      </div>

      <div className="page-content">
        {loading ? (
          <div className="loading-container">
            <div className="loading-spinner" />
          </div>
        ) : lists.length === 0 ? (
          <div className="chat-window-empty" style={{ background: "transparent" }}>
            <div className="empty-icon">
              <Users size={32} />
            </div>
            <h2>No contact lists yet</h2>
            <p>Upload an Excel or CSV file to save your contacts. You can select these lists when running campaigns.</p>
            <div style={{ display: "flex", gap: "12px", marginTop: "16px", justifyContent: "center" }}>
              <button 
                className="btn-secondary" 
                onClick={() => setShowManualModal(true)}
              >
                Create Empty List
              </button>
              <button 
                className="btn-primary" 
                onClick={() => setShowUploadModal(true)}
              >
                Upload Sheet
              </button>
            </div>
          </div>
        ) : (
          <div className="card-grid">
            {lists.map((list) => (
              <div key={list.id} className="ui-card animate-fade-in">
                <div className="ui-card-header">
                  <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                    <h3 className="ui-card-title">{list.name}</h3>
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
                        👤 Client: {list.client_username || "Direct Admin"}
                      </span>
                    )}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div className="ui-card-badge">
                      {list.member_count || 0} Contacts
                    </div>
                    <button 
                      onClick={() => handleDeleteList(list.id)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
                      title="Delete Sheet"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
                <div className="ui-card-subtitle" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: "12px", flexWrap: "wrap", gap: "10px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <FileSpreadsheet size={16} />
                    Created: {format(new Date(list.created_at), "MMM d, yyyy")}
                  </div>
                  <div style={{ display: "flex", gap: "8px" }}>
                    <Link href={`/contacts/${list.id}`} className="btn-secondary" style={{ padding: "6px 12px", fontSize: "12px" }}>
                      View Contacts
                    </Link>
                    {list.file_url && (
                      <a href={list.file_url} target="_blank" rel="noopener noreferrer" className="btn-secondary" style={{ padding: "6px 12px", fontSize: "12px" }}>
                        Download CSV
                      </a>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {}
      {showUploadModal && (
        <div className="modal-overlay" onClick={() => !uploading && setShowUploadModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
              <h2 className="modal-title" style={{ margin: 0 }}>Upload Contact Sheet</h2>
              <button 
                onClick={() => setShowUploadModal(false)}
                style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)" }}
                disabled={uploading}
              >
                <X size={24} />
              </button>
            </div>

            {error && (
              <div className="window-warning">
                <span className="window-warning-text">{error}</span>
              </div>
            )}

            {success && (
              <div style={{ padding: "12px", background: "var(--bubble-outbound)", color: "var(--secondary-accent)", borderRadius: "12px", marginBottom: "20px", display: "flex", alignItems: "center", gap: "8px" }}>
                <CheckCircle2 size={18} />
                {success}
              </div>
            )}

            {uploading ? (
              <div style={{ textAlign: "center", padding: "36px 16px" }}>
                <div
                  style={{
                    width: "56px",
                    height: "56px",
                    borderRadius: "50%",
                    border: "3px solid #e2e8f0",
                    borderTopColor: "var(--accent, #2563eb)",
                    animation: "spin 1s linear infinite",
                    margin: "0 auto 20px auto",
                  }}
                />
                <style>{`
                  @keyframes spin {
                    to { transform: rotate(360deg); }
                  }
                `}</style>
                <h3 style={{ fontSize: "17px", fontWeight: "600", color: "var(--text-primary)", marginBottom: "8px" }}>
                  Saving Contact List
                </h3>
                <p style={{ fontSize: "14px", color: "var(--text-secondary)", marginBottom: "20px" }}>
                  {uploadStep || "Analyzing spreadsheet and preparing contacts..."}
                </p>

                {/* Animated Progress Bar */}
                <div style={{ width: "100%", height: "8px", background: "#f1f5f9", borderRadius: "999px", overflow: "hidden", marginBottom: "16px" }}>
                  <div
                    style={{
                      height: "100%",
                      width: `${uploadProgress}%`,
                      background: "linear-gradient(90deg, #2563eb, #38bdf8)",
                      borderRadius: "999px",
                      transition: "width 0.4s ease-in-out",
                    }}
                  />
                </div>

                <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: "8px", fontSize: "12px", color: "#64748b" }}>
                  <span>⚡ High-Speed Batch Sync Active</span>
                  <span>•</span>
                  <span>Auto-detecting Columns</span>
                </div>
              </div>
            ) : (
              <form onSubmit={handleUpload}>
                <div className="form-group">
                  <label className="form-label">List Name</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g., Diwali 2026 Contacts, Sheet 1"
                    value={listName}
                    onChange={(e) => setListName(e.target.value)}
                    disabled={uploading}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label" style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                    <span>Excel / CSV File</span>
                  </label>
                  
                  <div style={{ padding: "10px 12px", background: "#f0fdf4", border: "1px solid #bbf7d0", color: "#166534", borderRadius: "8px", fontSize: "12px", marginBottom: "16px", display: "flex", gap: "8px", alignItems: "flex-start" }}>
                    <div style={{ marginTop: "1px", fontSize: "14px" }}>✨</div>
                    <div>
                      <strong>Smart Auto-Detection:</strong> Upload any Excel or CSV sheet. Column headers, names, phone numbers, and cities are auto-detected automatically. Country prefix `+91` is auto-formatted.
                    </div>
                  </div>

                  {file ? (
                    <div style={{ padding: "16px", background: "var(--bg-tertiary)", border: "1px solid var(--border-color)", borderRadius: "12px", display: "flex", alignItems: "center", gap: "12px" }}>
                      <FileSpreadsheet size={24} style={{ color: "var(--accent)" }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 600, color: "var(--text-primary)", fontSize: "14px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {file.name}
                        </div>
                        <div style={{ fontSize: "12px", color: "var(--text-muted)" }}>
                          {(file.size / 1024).toFixed(1)} KB
                        </div>
                      </div>
                      <button
                        type="button"
                        style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer" }}
                        onClick={() => { setFile(null); if (fileInputRef.current) fileInputRef.current.value = ""; }}
                        disabled={uploading}
                      >
                        <X size={18} />
                      </button>
                    </div>
                  ) : (
                    <div
                      className={`upload-zone ${dragover ? "dragover" : ""}`}
                      onDragOver={(e) => { e.preventDefault(); setDragover(true); }}
                      onDragLeave={() => setDragover(false)}
                      onDrop={handleDrop}
                      onClick={() => fileInputRef.current?.click()}
                      style={{ padding: "32px 20px" }}
                    >
                      <div className="upload-icon" style={{ width: "56px", height: "56px", marginBottom: "16px" }}>
                        <Upload size={24} />
                      </div>
                      <h3 style={{ fontSize: "16px" }}>Drop file or click to browse</h3>
                      <p style={{ fontSize: "13px" }}>Supports .xlsx, .xls, .csv</p>
                    </div>
                  )}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".xlsx,.xls,.csv"
                    onChange={handleFileSelect}
                    style={{ display: "none" }}
                    disabled={uploading}
                  />
                </div>

                <div className="modal-actions" style={{ marginTop: "24px" }}>
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() => setShowUploadModal(false)}
                    disabled={uploading}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn-primary"
                    disabled={uploading || !listName.trim() || !file}
                  >
                    Save List
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Manual Create Modal */}
      {showManualModal && (
        <div className="modal-overlay" onClick={() => !uploading && setShowManualModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
              <h2 className="modal-title" style={{ margin: 0 }}>Create Empty List</h2>
              <button 
                onClick={() => setShowManualModal(false)}
                style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)" }}
                disabled={uploading}
              >
                <X size={24} />
              </button>
            </div>

            {error && (
              <div className="window-warning">
                <span className="window-warning-text">{error}</span>
              </div>
            )}

            {success && (
              <div style={{ padding: "12px", background: "var(--bubble-outbound)", color: "var(--secondary-accent)", borderRadius: "12px", marginBottom: "20px", display: "flex", alignItems: "center", gap: "8px" }}>
                <CheckCircle2 size={18} />
                {success}
              </div>
            )}

            <form onSubmit={handleManualCreate}>
              <div className="form-group">
                <label className="form-label">List Name</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g., Manual Contacts 2026"
                  value={manualListName}
                  onChange={(e) => setManualListName(e.target.value)}
                  disabled={uploading}
                  required
                />
              </div>

              <div className="modal-actions" style={{ marginTop: "24px" }}>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setShowManualModal(false)}
                  disabled={uploading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={uploading || !manualListName.trim()}
                >
                  {uploading ? "Creating..." : "Create List"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
