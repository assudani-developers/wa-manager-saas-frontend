"use client";

import { useState, useEffect } from "react";
import { getMedia, uploadMedia, deleteMedia, normalizeMediaUrl } from "../lib/api";
import { Upload, Trash2, Image as ImageIcon, Video, FileText } from "lucide-react";
import { useToast } from "../components/ToastProvider";

export default function MediaLibraryPage() {
  const { showSuccess, showError } = useToast();
  const [media, setMedia] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [imageErrors, setImageErrors] = useState({});

  useEffect(() => {
    fetchMedia();
  }, []);

  async function fetchMedia() {
    try {
      setLoading(true);
      const res = await getMedia();
      setMedia(res.data);
    } catch (err) {
      setError("Failed to fetch media library.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      setUploading(true);
      const formData = new FormData();
      formData.append("file", file);
      
      await uploadMedia(formData);
      showSuccess(`File "${file.name}" uploaded successfully to media storage.`);
      await fetchMedia();
    } catch (err) {
      showError(err.response?.data?.error || "Failed to upload media.");
      console.error(err);
    } finally {
      setUploading(false);
      e.target.value = null; 
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("Are you sure you want to delete this file?")) return;
    
    try {
      await deleteMedia(id);
      setMedia(media.filter(m => m.id !== id));
      showSuccess("Media file deleted successfully.");
    } catch (err) {
      showError(err.response?.data?.error || "Failed to delete media.");
      console.error(err);
    }
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <h1 className="page-title">Media Library</h1>
        <label className="btn-primary" style={{ cursor: "pointer", display: "inline-flex", gap: "8px", alignItems: "center" }}>
          {uploading ? (
            <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
          ) : (
            <Upload size={18} />
          )}
          Upload New Media
          <input type="file" className="hidden" onChange={handleFileUpload} accept="image/*,video/*" disabled={uploading} />
        </label>
      </div>

      <div className="page-content">
        {error && (
          <div style={{ background: "rgba(255, 0, 0, 0.1)", color: "red", padding: "12px", borderRadius: "8px", marginBottom: "20px" }}>
            {error}
          </div>
        )}

        {loading ? (
          <div className="loading-container">
            <div className="loading-spinner" />
          </div>
        ) : media.length === 0 ? (
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
              <ImageIcon size={32} />
            </div>
            <h2
              style={{
                fontSize: "20px",
                fontWeight: "600",
                color: "var(--text-primary)",
                marginBottom: "8px",
              }}
            >
              No media found
            </h2>
            <p style={{ fontSize: "14px", maxWidth: "400px", lineHeight: 1.6 }}>
              Upload an image or video to get started.
            </p>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: "16px" }}>
            {media.map((item) => (
              <div key={item.id} className="ui-card animate-fade-in" style={{ padding: "0", overflow: "hidden", position: "relative", display: "flex", flexDirection: "column" }}>
                <div style={{ aspectRatio: "1/1", background: "var(--bg-tertiary)", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
                  {item.resource_type === 'video' ? (
                    <video src={normalizeMediaUrl(item.media_url)} style={{ width: "100%", height: "100%", objectFit: "cover" }} controls />
                  ) : imageErrors[item.id] ? (
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "8px", color: "var(--text-muted)" }}>
                      <ImageIcon size={32} style={{ opacity: 0.5 }} />
                      <span style={{ fontSize: "11px", fontWeight: "500" }}>Image not found</span>
                    </div>
                  ) : (
                    <img 
                      src={normalizeMediaUrl(item.media_url)} 
                      alt="" 
                      style={{ width: "100%", height: "100%", objectFit: "cover" }}
                      onError={() => setImageErrors(prev => ({ ...prev, [item.id]: true }))}
                    />
                  )}
                </div>
                <div style={{ padding: "12px" }}>
                  <p style={{ fontSize: "14px", fontWeight: "600", color: "var(--text-primary)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }} title={item.original_name}>
                    {item.original_name}
                  </p>
                  <p style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "4px", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                    {item.resource_type}
                  </p>
                </div>
                
                <button 
                  onClick={() => handleDelete(item.id)}
                  style={{
                    position: "absolute",
                    top: "8px",
                    right: "8px",
                    padding: "8px",
                    background: "rgba(255, 0, 0, 0.9)",
                    color: "white",
                    border: "none",
                    borderRadius: "50%",
                    cursor: "pointer",
                    boxShadow: "var(--shadow-sm)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center"
                  }}
                  title="Delete"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
