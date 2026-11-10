"use client";

import { useState, useEffect } from "react";
import { X, Search, Upload, Image as ImageIcon, Video, FileText, Check, Plus } from "lucide-react";
import { getMedia, uploadMedia, normalizeMediaUrl } from "../lib/api";
import { useToast } from "./ToastProvider";

export default function MediaPickerModal({ isOpen, onClose, onSelect, mediaType = "all", title = "Select from Media Gallery" }) {
  const { showSuccess, showError } = useToast();
  const [media, setMedia] = useState([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedId, setSelectedId] = useState(null);

  useEffect(() => {
    if (isOpen) {
      loadMedia();
    }
  }, [isOpen]);

  const loadMedia = async () => {
    try {
      setLoading(true);
      const res = await getMedia();
      setMedia(res.data || []);
    } catch (err) {
      console.error("Failed to fetch media:", err);
      showError("Failed to load media assets from gallery.");
    } finally {
      setLoading(false);
    }
  };

  const handleQuickUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploading(true);
      const formData = new FormData();
      formData.append("file", file);
      const res = await uploadMedia(formData);
      showSuccess(`"${file.name}" uploaded to Media Gallery!`);
      const newAsset = res.data;
      setMedia((prev) => [newAsset, ...prev]);
      // Auto select the newly uploaded file
      onSelect(newAsset);
      onClose();
    } catch (err) {
      console.error("Upload error:", err);
      showError(err.response?.data?.error || "Failed to upload file to media library.");
    } finally {
      setUploading(false);
      e.target.value = null;
    }
  };

  if (!isOpen) return null;

  const filteredMedia = media.filter((item) => {
    // Type filtering
    if (mediaType === "image" && item.resource_type !== "image") return false;
    if (mediaType === "video" && item.resource_type !== "video") return false;
    if (mediaType === "document" && item.resource_type !== "document" && item.resource_type !== "raw") return false;

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const name = (item.original_name || "").toLowerCase();
      return name.includes(q);
    }
    return true;
  });

  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 1100 }}>
      <div
        className="modal"
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: "760px",
          width: "92%",
          maxHeight: "88vh",
          display: "flex",
          flexDirection: "column",
          padding: "24px",
        }}
      >
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div style={{ padding: "8px", background: "var(--accent-glow)", borderRadius: "10px", color: "var(--accent)" }}>
              <ImageIcon size={20} />
            </div>
            <div>
              <h3 className="modal-title" style={{ margin: 0, fontSize: "18px", fontWeight: "700" }}>
                {title}
              </h3>
              <p style={{ margin: "2px 0 0", fontSize: "12px", color: "var(--text-muted)" }}>
                Choose an existing image or media uploaded to your software
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              color: "var(--text-muted)",
              padding: "6px",
              borderRadius: "8px",
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Search & Quick Upload Bar */}
        <div style={{ display: "flex", gap: "12px", marginBottom: "18px" }}>
          <div style={{ position: "relative", flex: 1 }}>
            <Search
              size={16}
              style={{
                position: "absolute",
                left: "12px",
                top: "50%",
                transform: "translateY(-50%)",
                color: "var(--text-muted)",
              }}
            />
            <input
              type="text"
              placeholder="Search images by name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="form-input"
              style={{ paddingLeft: "36px", height: "40px", fontSize: "13px" }}
            />
          </div>

          <label
            className="btn-secondary"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              cursor: uploading ? "not-allowed" : "pointer",
              padding: "0 16px",
              height: "40px",
              fontSize: "13px",
              fontWeight: "600",
              whiteSpace: "nowrap",
            }}
          >
            {uploading ? (
              <span>Uploading...</span>
            ) : (
              <>
                <Plus size={16} />
                <span>Upload New</span>
              </>
            )}
            <input
              type="file"
              style={{ display: "none" }}
              accept={
                mediaType === "image"
                  ? "image/*"
                  : mediaType === "video"
                  ? "video/*"
                  : mediaType === "document"
                  ? "application/pdf"
                  : "*/*"
              }
              onChange={handleQuickUpload}
              disabled={uploading}
            />
          </label>
        </div>

        {/* Media Grid */}
        <div
          style={{
            flex: 1,
            overflowY: "auto",
            minHeight: "280px",
            maxHeight: "50vh",
            paddingRight: "4px",
          }}
        >
          {loading ? (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "240px", color: "var(--text-muted)", fontSize: "14px" }}>
              Loading media gallery...
            </div>
          ) : filteredMedia.length === 0 ? (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                height: "240px",
                textAlign: "center",
                border: "2px dashed var(--border-color)",
                borderRadius: "16px",
                padding: "24px",
              }}
            >
              <div style={{ padding: "16px", background: "var(--bg-tertiary)", borderRadius: "50%", color: "var(--text-muted)", marginBottom: "12px" }}>
                <ImageIcon size={32} />
              </div>
              <h4 style={{ margin: "0 0 4px", fontSize: "15px", fontWeight: "600", color: "var(--text-primary)" }}>
                No media found
              </h4>
              <p style={{ margin: "0 0 16px", fontSize: "13px", color: "var(--text-muted)", maxWidth: "320px" }}>
                {searchQuery ? "No media files match your search query." : "You haven't uploaded any media files to the library yet."}
              </p>
              <label
                className="btn-primary"
                style={{ cursor: "pointer", display: "inline-flex", alignItems: "center", gap: "8px", fontSize: "13px" }}
              >
                <Upload size={16} />
                <span>Upload First Image</span>
                <input
                  type="file"
                  style={{ display: "none" }}
                  accept={mediaType === "image" ? "image/*" : "*/*"}
                  onChange={handleQuickUpload}
                />
              </label>
            </div>
          ) : (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))",
                gap: "12px",
              }}
            >
              {filteredMedia.map((item) => {
                const src = normalizeMediaUrl(item.media_url);
                const isSelected = selectedId === item.id;
                const isImg = !item.resource_type || item.resource_type === "image" || src.match(/\.(jpg|jpeg|png|webp|gif|svg)$/i);
                const isVid = item.resource_type === "video" || src.match(/\.(mp4|webm|mov)$/i);

                return (
                  <div
                    key={item.id}
                    onClick={() => {
                      setSelectedId(item.id);
                      onSelect(item);
                      onClose();
                    }}
                    style={{
                      border: isSelected ? "2px solid var(--accent)" : "1px solid var(--border-color)",
                      borderRadius: "12px",
                      overflow: "hidden",
                      cursor: "pointer",
                      background: "var(--bg-primary)",
                      transition: "transform 0.15s, border-color 0.15s, box-shadow 0.15s",
                      position: "relative",
                      display: "flex",
                      flexDirection: "column",
                    }}
                    className="hover:scale-[1.02] hover:border-accent"
                    title={item.original_name || "Media File"}
                  >
                    {/* Media Thumbnail */}
                    <div
                      style={{
                        height: "120px",
                        background: "rgba(0,0,0,0.04)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        overflow: "hidden",
                        position: "relative",
                      }}
                    >
                      {isImg ? (
                        <img
                          src={src}
                          alt={item.original_name}
                          style={{ width: "100%", height: "100%", objectFit: "cover" }}
                          onError={(e) => {
                            e.currentTarget.style.display = "none";
                            if (e.currentTarget.nextSibling) {
                              e.currentTarget.nextSibling.style.display = "flex";
                            }
                          }}
                        />
                      ) : isVid ? (
                        <div style={{ position: "relative", width: "100%", height: "100%" }}>
                          <video
                            src={src}
                            muted
                            playsInline
                            preload="metadata"
                            style={{ width: "100%", height: "100%", objectFit: "cover" }}
                          />
                          <div style={{ position: "absolute", bottom: "6px", left: "6px", background: "rgba(0,0,0,0.7)", color: "white", padding: "2px 6px", borderRadius: "4px", fontSize: "10px", display: "flex", alignItems: "center", gap: "4px", pointerEvents: "none" }}>
                            <Video size={12} />
                            <span>Video</span>
                          </div>
                        </div>
                      ) : (
                        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "4px", color: "var(--text-muted)" }}>
                          <FileText size={28} />
                          <span style={{ fontSize: "11px" }}>Document</span>
                        </div>
                      )}

                      {/* Fallback Icon for image errors */}
                      <div
                        style={{
                          display: "none",
                          width: "100%",
                          height: "100%",
                          alignItems: "center",
                          justifyContent: "center",
                          background: "rgba(0,0,0,0.05)",
                          color: "var(--text-muted)",
                        }}
                      >
                        <ImageIcon size={28} />
                      </div>

                      {/* Selection Badge */}
                      {isSelected && (
                        <div
                          style={{
                            position: "absolute",
                            top: "8px",
                            right: "8px",
                            background: "var(--accent)",
                            color: "white",
                            borderRadius: "50%",
                            padding: "4px",
                            display: "flex",
                          }}
                        >
                          <Check size={14} />
                        </div>
                      )}
                    </div>

                    {/* Meta info */}
                    <div style={{ padding: "8px 10px", display: "flex", flexDirection: "column" }}>
                      <span
                        style={{
                          fontSize: "12px",
                          fontWeight: "600",
                          color: "var(--text-primary)",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {item.original_name || "Untitled"}
                      </span>
                      <span style={{ fontSize: "10px", color: "var(--text-muted)", textTransform: "capitalize", marginTop: "2px" }}>
                        {item.resource_type || "Image"}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "16px", paddingTop: "12px", borderTop: "1px solid var(--border-color)" }}>
          <button type="button" className="btn-secondary" onClick={onClose} style={{ fontSize: "13px", padding: "8px 18px" }}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

