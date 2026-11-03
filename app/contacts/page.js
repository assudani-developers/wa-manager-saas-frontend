"use client";

import { useState, useEffect, useRef } from "react";
import { Upload, Users, FileSpreadsheet, X, CheckCircle2, Trash2, Plus } from "lucide-react";
import Link from "next/link";
import api, { deleteContactList } from "../lib/api";
import { format } from "date-fns";
import { useToast } from "../components/ToastProvider";

export default function ContactsPage() {
  const { showSuccess, showError } = useToast();
  const [lists, setLists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showManualModal, setShowManualModal] = useState(false);
  const [manualListName, setManualListName] = useState("");
  
  
  const fileInputRef = useRef(null);
  const [listName, setListName] = useState("");
  const [file, setFile] = useState(null);
  const [dragover, setDragover] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const fetchLists = async () => {
    try {
      const res = await api.get("/api/contact_lists");
      setLists(res.data);
    } catch (err) {
      console.error("Failed to fetch contact lists:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLists();
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
    setError(null);

    try {
      const formData = new FormData();
      formData.append("name", listName.trim());
      formData.append("file", file);

      await api.post("/api/contact_lists", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      setSuccess("List saved successfully!");
      showSuccess(`Contact list "${listName.trim()}" saved successfully!`);
      fetchLists();
      
      setTimeout(() => {
        setShowUploadModal(false);
        setSuccess(null);
        setFile(null);
        setListName("");
      }, 1500);
    } catch (err) {
      setError(err.response?.data?.error || "Failed to upload list");
    } finally {
      setUploading(false);
    }
  };

  const handleManualCreate = async (e) => {
    e.preventDefault();
    if (!manualListName.trim()) {
      setError("Please provide a name for the list");
      return;
    }

    setUploading(true);
    setError(null);

    try {
      await api.post("/api/contact_lists/manual", { name: manualListName.trim() });
      setSuccess("Empty list created successfully!");
      showSuccess(`List "${manualListName.trim()}" created successfully!`);
      fetchLists();
      
      setTimeout(() => {
        setShowManualModal(false);
        setSuccess(null);
        setManualListName("");
      }, 1500);
    } catch (err) {
      setError(err.response?.data?.error || "Failed to create list");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <h1 className="page-title">Contact Lists</h1>
        <div style={{ display: "flex", gap: "12px" }}>
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
                  <h3 className="ui-card-title">{list.name}</h3>
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
                
                <div style={{ padding: "10px 12px", background: "var(--accent-muted)", color: "var(--text-primary)", borderRadius: "8px", fontSize: "12px", marginBottom: "16px", display: "flex", gap: "8px" }}>
                  <div style={{ color: "var(--accent)", marginTop: "2px" }}>ℹ️</div>
                  <div>
                    <strong>Format Required:</strong> Your file should have 4 columns: <strong>S.No, Name, Mobile Number, and City</strong>. Mobile number must be in the 3rd column (Column C). (Country code `+91` is automatically added).
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
                  {uploading ? "Saving..." : "Save List"}
                </button>
              </div>
            </form>
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
