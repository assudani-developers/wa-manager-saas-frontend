"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Megaphone, ArrowLeft, X, Image as ImageIcon, FolderOpen, Upload, Calendar, Clock, Send } from "lucide-react";
import api, { normalizeMediaUrl } from "../../lib/api";
import { useToast } from "../../components/ToastProvider";
import MediaPickerModal from "../../components/MediaPickerModal";

export default function NewCampaignPage() {
  const router = useRouter();
  const { showSuccess, showError } = useToast();
  const [name, setName] = useState("");
  const [templateName, setTemplateName] = useState("");
  const [languageCode, setLanguageCode] = useState("en_US");
  const [selectedListIds, setSelectedListIds] = useState([]);
  const [mediaFile, setMediaFile] = useState(null);
  const [selectedGalleryMedia, setSelectedGalleryMedia] = useState(null);
  const [isMediaPickerOpen, setIsMediaPickerOpen] = useState(false);

  const [templates, setTemplates] = useState([]);
  const [loadingTemplates, setLoadingTemplates] = useState(true);

  const [contactLists, setContactLists] = useState([]);
  const [loadingLists, setLoadingLists] = useState(true);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [activeChannel, setActiveChannel] = useState(null);
  const [isMasterAdmin, setIsMasterAdmin] = useState(false);

  // Scheduling states
  const [isScheduled, setIsScheduled] = useState(false);
  const [scheduleDate, setScheduleDate] = useState("");
  const [scheduleTime, setScheduleTime] = useState("");

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [listsRes, templatesRes] = await Promise.all([
          api.get("/api/contact_lists"),
          api.get("/api/templates")
        ]);
        setContactLists(listsRes.data);

        const approvedOnly = (templatesRes.data || []).filter(t => t.status === 'APPROVED');
        setTemplates(approvedOnly);

        if (typeof window !== "undefined") {
          const role = localStorage.getItem("user_role");
          const userStr = localStorage.getItem("user");
          const user = userStr ? JSON.parse(userStr) : null;
          const activeClientId = localStorage.getItem("active_client_id");
          const isMaster = (role === "master_admin" || user?.role === "master_admin" || user?.username?.toLowerCase() === "piyushassudani") && !activeClientId;
          setIsMasterAdmin(isMaster);
        }

        api.get("/api/users/channel-config")
          .then((res) => setActiveChannel(res.data))
          .catch(() => { });
      } catch (err) {
        console.error("Failed to fetch data:", err);
        setError("Failed to load required data. Please refresh and try again.");
      } finally {
        setLoadingLists(false);
        setLoadingTemplates(false);
      }
    };
    fetchData();
  }, []);

  const selectedTemplate = templates.find((t) => t.name === templateName);
  const headerComponent = selectedTemplate?.components?.find((c) => c.type === "HEADER");
  const bodyComponent = selectedTemplate?.components?.find((c) => c.type === "BODY");
  const footerComponent = selectedTemplate?.components?.find((c) => c.type === "FOOTER");
  const buttonsComponent = selectedTemplate?.components?.find((c) => c.type === "BUTTONS");

  const requiresMediaHeader = headerComponent && ["IMAGE", "VIDEO", "DOCUMENT"].includes(headerComponent.format);
  const requiredMediaFormat = requiresMediaHeader ? headerComponent.format : null;

  let previewMediaUrl = null;
  if (selectedGalleryMedia) {
    previewMediaUrl = normalizeMediaUrl(selectedGalleryMedia.media_url);
  } else if (mediaFile && mediaFile.type?.startsWith("image/")) {
    previewMediaUrl = URL.createObjectURL(mediaFile);
  } else if (headerComponent?.example?.header_handle?.[0]?.startsWith("http")) {
    previewMediaUrl = headerComponent.example.header_handle[0];
  }

  const previewBodyText = bodyComponent?.text
    ? bodyComponent.text.replace(/\{\{1\}\}/g, "[Customer Name]").replace(/\{\{2\}\}/g, "[City]").replace(/\{\{\d+\}\}/g, "...")
    : "";

  const handleTemplateSelect = (e) => {
    const selected = templates.find(t => t.name === e.target.value);
    if (selected) {
      setTemplateName(selected.name);
      setLanguageCode(selected.language);
      const hdr = selected.components?.find(c => c.type === "HEADER");
      if (!hdr || !["IMAGE", "VIDEO", "DOCUMENT"].includes(hdr.format)) {
        setMediaFile(null);
        setSelectedGalleryMedia(null);
      }
    } else {
      setTemplateName("");
      setLanguageCode("en_US");
      setMediaFile(null);
      setSelectedGalleryMedia(null);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!name.trim() || !templateName.trim() || selectedListIds.length === 0) {
      showError("Please fill in campaign name, select a template, and choose at least one contact list.");
      setError("Please fill all fields and select at least one contact list");
      return;
    }

    if (requiresMediaHeader && !mediaFile && !selectedGalleryMedia) {
      const msg = `Template "${templateName}" requires a ${requiredMediaFormat.toLowerCase()} header. Please select from Media Gallery or attach a file.`;
      showError(msg);
      setError(msg);
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("name", name.trim());
      formData.append("template_name", templateName.trim());
      formData.append("language_code", languageCode);
      formData.append("contact_list_ids", JSON.stringify(selectedListIds));
      if (isScheduled && scheduleDate && scheduleTime) {
        const scheduledDateTime = new Date(`${scheduleDate}T${scheduleTime}`);
        formData.append("scheduled_at", scheduledDateTime.toISOString());
      }
      if (requiresMediaHeader) {
        if (mediaFile) {
          formData.append("mediaFile", mediaFile);
        } else if (selectedGalleryMedia) {
          formData.append("media_url", selectedGalleryMedia.media_url);
          if (selectedGalleryMedia.meta_media_id) {
            formData.append("media_id", selectedGalleryMedia.meta_media_id);
          }
          formData.append("media_type", (selectedGalleryMedia.resource_type || requiredMediaFormat || "image").toLowerCase());
        }
      }

      const res = await api.post("/api/campaigns", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      const launchMsg = `Campaign "${res.data.campaign.name}" launched successfully! Processing ${res.data.campaign.total_recipients} recipients...`;
      setSuccess(launchMsg);
      showSuccess(launchMsg);

      setTimeout(() => {
        router.push("/campaigns");
      }, 2000);
    } catch (err) {
      console.error("Campaign creation failed:", err);
      const errMsg = err.response?.data?.error || "Failed to create campaign";
      setError(errMsg);
      showError(errMsg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <Link href="/campaigns" className="btn-secondary" style={{ padding: "10px" }}>
            <ArrowLeft size={20} />
          </Link>
          <h1 className="page-title">Launch Campaign</h1>
        </div>
      </div>

      <div className="page-content" style={{ display: "flex", gap: "28px", alignItems: "flex-start", maxWidth: "1280px" }}>
        <div className="ui-card" style={{ flex: 1, minWidth: 0, padding: "28px" }}>
          <form onSubmit={handleSubmit}>
            { }
            {error && (
              <div className="window-warning" style={{ marginBottom: "24px" }}>
                <span className="window-warning-text">{error}</span>
                <button
                  type="button"
                  style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer" }}
                  onClick={() => setError(null)}
                >
                  <X size={16} />
                </button>
              </div>
            )}

            { }
            {success && (
              <div style={{ padding: "16px", background: "var(--bubble-outbound)", border: "1px solid var(--secondary-accent-muted)", borderRadius: "12px", marginBottom: "24px", color: "var(--secondary-accent)", fontSize: "15px", fontWeight: "600" }}>
                ✅ {success}
              </div>
            )}

            {/* Active Channel Indicator (Master Admin Only - Hidden from regular clients) */}
            {isMasterAdmin && activeChannel && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "12px 16px",
                  borderRadius: "10px",
                  background: activeChannel.active_mode === "personal" ? "rgba(124, 58, 237, 0.08)" : "rgba(37, 99, 235, 0.08)",
                  border: `1px solid ${activeChannel.active_mode === "personal" ? "rgba(124, 58, 237, 0.2)" : "rgba(37, 99, 235, 0.2)"}`,
                  marginBottom: "20px",
                  fontSize: "13px",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <span style={{ fontWeight: 600, color: "var(--text-primary)" }}>Active Sender Channel:</span>
                  <span style={{ color: activeChannel.active_mode === "personal" ? "#7c3aed" : "#2563eb", fontWeight: 700 }}>
                    {activeChannel.active_mode === "personal"
                      ? `Personal Meta API (${activeChannel.personal?.display_phone_number || activeChannel.personal?.verified_name || "Custom Number"})`
                      : (activeChannel.company?.phone_number ? `Company WhatsApp Central (${activeChannel.company.phone_number})` : "Company WhatsApp Central Channel")}
                  </span>
                </div>
                <Link href="/settings" style={{ fontSize: "12px", color: "var(--accent)", textDecoration: "none", fontWeight: 600 }}>
                  Switch Channel →
                </Link>
              </div>
            )}

            <div className="form-group">
              <label className="form-label">Campaign Name</label>
              <input
                className="form-input"
                type="text"
                placeholder="e.g., Diwali Offer 2026"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                <label className="form-label">Meta Template</label>
                <Link href="/templates/new" style={{ fontSize: "12px", color: "var(--accent)", textDecoration: "none", fontWeight: "500" }}>
                  + Create New
                </Link>
              </div>
              {loadingTemplates ? (
                <div style={{ padding: "14px 16px", background: "var(--bg-tertiary)", borderRadius: "12px", color: "var(--text-secondary)" }}>
                  Fetching approved templates from Meta...
                </div>
              ) : templates.length === 0 ? (
                <div style={{ padding: "16px", background: "var(--warning-bg)", borderRadius: "12px", color: "var(--warning-text)" }}>
                  No approved templates found in your Meta account.
                </div>
              ) : (
                <select
                  className="form-select"
                  value={templateName}
                  onChange={handleTemplateSelect}
                  required
                >
                  <option value="" disabled>-- Select a template --</option>
                  {templates.map((tpl) => (
                    <option key={`${tpl.name}-${tpl.language}`} value={tpl.name}>
                      {tpl.name} ({tpl.language})
                    </option>
                  ))}
                </select>
              )}
            </div>

            {requiresMediaHeader && (
              <div className="form-group" style={{ background: "var(--bg-tertiary)", padding: "20px", borderRadius: "14px", border: "1px dashed var(--border-color)", marginBottom: "24px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                  <label className="form-label" style={{ display: "flex", alignItems: "center", gap: "8px", margin: 0 }}>
                    <ImageIcon size={18} color="var(--accent)" />
                    Select {requiredMediaFormat.charAt(0) + requiredMediaFormat.slice(1).toLowerCase()} Header (Required)
                  </label>
                  <span style={{ fontSize: "11px", fontWeight: "600", padding: "3px 8px", background: "var(--accent-glow)", color: "var(--accent)", borderRadius: "6px" }}>
                    Header Media
                  </span>
                </div>
                <p style={{ fontSize: "13px", color: "var(--text-muted)", marginBottom: "16px" }}>
                  This Meta template requires a {requiredMediaFormat.toLowerCase()} in the message header. You can pick an image from your software&apos;s Media Gallery or upload from your device.
                </p>

                {/* Selected Gallery Media Card */}
                {selectedGalleryMedia ? (
                  <div style={{ display: "flex", alignItems: "center", gap: "14px", background: "var(--bg-primary)", padding: "12px 14px", borderRadius: "12px", border: "1px solid var(--border-color)", marginBottom: "8px" }}>
                    <img
                      src={normalizeMediaUrl(selectedGalleryMedia.media_url)}
                      alt="Selected"
                      style={{ width: "64px", height: "64px", borderRadius: "8px", objectFit: "cover" }}
                    />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: "14px", fontWeight: "600", color: "var(--text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {selectedGalleryMedia.original_name || "Gallery Media"}
                      </div>
                      <span style={{ fontSize: "11px", color: "var(--secondary-accent)", fontWeight: "500", display: "inline-flex", alignItems: "center", gap: "4px" }}>
                        ✓ Selected from Media Gallery
                      </span>
                    </div>
                    <div style={{ display: "flex", gap: "8px" }}>
                      <button
                        type="button"
                        className="btn-secondary"
                        style={{ fontSize: "12px", padding: "6px 12px" }}
                        onClick={() => setIsMediaPickerOpen(true)}
                      >
                        Change
                      </button>
                      <button
                        type="button"
                        style={{ background: "none", border: "none", color: "var(--danger)", cursor: "pointer", padding: "6px" }}
                        onClick={() => setSelectedGalleryMedia(null)}
                        title="Remove"
                      >
                        <X size={18} />
                      </button>
                    </div>
                  </div>
                ) : mediaFile ? (
                  <div style={{ display: "flex", alignItems: "center", gap: "14px", background: "var(--bg-primary)", padding: "12px 14px", borderRadius: "12px", border: "1px solid var(--border-color)", marginBottom: "8px" }}>
                    <div style={{ width: "64px", height: "64px", borderRadius: "8px", background: "var(--accent-glow)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--accent)" }}>
                      <ImageIcon size={28} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: "14px", fontWeight: "600", color: "var(--text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {mediaFile.name}
                      </div>
                      <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>
                        {(mediaFile.size / (1024 * 1024)).toFixed(2)} MB • Ready to upload from device
                      </span>
                    </div>
                    <button
                      type="button"
                      style={{ background: "none", border: "none", color: "var(--danger)", cursor: "pointer", padding: "6px" }}
                      onClick={() => setMediaFile(null)}
                      title="Remove"
                    >
                      <X size={18} />
                    </button>
                  </div>
                ) : (
                  <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
                    <button
                      type="button"
                      className="btn-primary"
                      style={{ display: "inline-flex", alignItems: "center", gap: "8px", fontSize: "13px", padding: "10px 18px" }}
                      onClick={() => setIsMediaPickerOpen(true)}
                    >
                      <FolderOpen size={16} />
                      <span>Choose from Media Gallery</span>
                    </button>

                    <label
                      className="btn-secondary"
                      style={{ display: "inline-flex", alignItems: "center", gap: "8px", fontSize: "13px", padding: "10px 18px", cursor: "pointer" }}
                    >
                      <Upload size={16} />
                      <span>Upload from Device</span>
                      <input
                        type="file"
                        style={{ display: "none" }}
                        accept={
                          requiredMediaFormat === "IMAGE"
                            ? "image/*"
                            : requiredMediaFormat === "VIDEO"
                              ? "video/*"
                              : "application/pdf"
                        }
                        onChange={(e) => {
                          const file = e.target.files[0] || null;
                          setMediaFile(file);
                          setSelectedGalleryMedia(null);
                        }}
                      />
                    </label>
                  </div>
                )}
              </div>
            )}

            <div className="form-group">
              <label className="form-label">Select Contact Lists (Sheets)</label>
              {loadingLists ? (
                <div style={{ padding: "14px 16px", background: "var(--bg-tertiary)", borderRadius: "12px", color: "var(--text-secondary)" }}>
                  Loading lists...
                </div>
              ) : contactLists.length === 0 ? (
                <div style={{ padding: "16px", background: "var(--warning-bg)", borderRadius: "12px", color: "var(--warning-text)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span>No contact lists found. Please upload a sheet first.</span>
                  <Link href="/contacts" className="btn-secondary" style={{ padding: "8px 16px", fontSize: "13px" }}>
                    Go to Contacts
                  </Link>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "8px", background: "var(--bg-tertiary)", padding: "16px", borderRadius: "12px", border: "1px solid var(--border-color)", maxHeight: "240px", overflowY: "auto" }}>
                  {contactLists.map((list) => (
                    <label key={list.id} style={{ display: "flex", alignItems: "center", gap: "12px", cursor: "pointer", padding: "8px", borderRadius: "8px", transition: "background 0.2s" }} className="hover:bg-var(--bg-secondary)">
                      <input
                        type="checkbox"
                        style={{ width: "18px", height: "18px", accentColor: "var(--accent)", cursor: "pointer" }}
                        checked={selectedListIds.includes(list.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedListIds([...selectedListIds, list.id]);
                          } else {
                            setSelectedListIds(selectedListIds.filter(id => id !== list.id));
                          }
                        }}
                      />
                      <div style={{ display: "flex", flexDirection: "column" }}>
                        <span style={{ fontSize: "14px", fontWeight: "500", color: "var(--text-primary)" }}>{list.name}</span>
                        <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>{list.member_count || 0} contacts</span>
                      </div>
                    </label>
                  ))}
                </div>
              )}
            </div>

            {/* Delivery Timing & Scheduling */}
            <div style={{ marginTop: "28px", padding: "18px", borderRadius: "12px", background: "var(--bg-tertiary)", border: "1px solid var(--border-color)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px" }}>
                <Clock size={18} color="var(--accent)" />
                <span style={{ fontSize: "14px", fontWeight: 700, color: "var(--text-primary)" }}>
                  Delivery Timing &amp; Dispatch
                </span>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "14px" }}>
                <button
                  type="button"
                  onClick={() => setIsScheduled(false)}
                  style={{
                    padding: "10px 14px",
                    borderRadius: "8px",
                    border: `2px solid ${!isScheduled ? "var(--accent)" : "var(--border-color)"}`,
                    background: !isScheduled ? "rgba(0, 34, 119, 0.08)" : "var(--bg-secondary)",
                    color: !isScheduled ? "var(--accent)" : "var(--text-muted)",
                    fontWeight: 600,
                    fontSize: "13px",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "6px",
                  }}
                >
                  <Send size={15} />
                  Send Immediately
                </button>

                <button
                  type="button"
                  onClick={() => setIsScheduled(true)}
                  style={{
                    padding: "10px 14px",
                    borderRadius: "8px",
                    border: `2px solid ${isScheduled ? "#7c3aed" : "var(--border-color)"}`,
                    background: isScheduled ? "rgba(124, 58, 237, 0.08)" : "var(--bg-secondary)",
                    color: isScheduled ? "#7c3aed" : "var(--text-muted)",
                    fontWeight: 600,
                    fontSize: "13px",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "6px",
                  }}
                >
                  <Calendar size={15} />
                  Schedule for Later
                </button>
              </div>

              {isScheduled && (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginTop: "12px" }}>
                  <div>
                    <label style={{ display: "block", fontSize: "12px", fontWeight: 600, marginBottom: "4px", color: "var(--text-primary)" }}>
                      Dispatch Date
                    </label>
                    <input
                      type="date"
                      required={isScheduled}
                      value={scheduleDate}
                      min={new Date().toISOString().split("T")[0]}
                      onChange={(e) => setScheduleDate(e.target.value)}
                      style={{
                        width: "100%",
                        padding: "8px 10px",
                        borderRadius: "6px",
                        background: "var(--bg-secondary)",
                        border: "1px solid var(--border-color)",
                        color: "var(--text-primary)",
                        fontSize: "13px",
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: "block", fontSize: "12px", fontWeight: 600, marginBottom: "4px", color: "var(--text-primary)" }}>
                      Dispatch Time
                    </label>
                    <input
                      type="time"
                      required={isScheduled}
                      value={scheduleTime}
                      onChange={(e) => setScheduleTime(e.target.value)}
                      style={{
                        width: "100%",
                        padding: "8px 10px",
                        borderRadius: "6px",
                        background: "var(--bg-secondary)",
                        border: "1px solid var(--border-color)",
                        color: "var(--text-primary)",
                        fontSize: "13px",
                      }}
                    />
                  </div>
                </div>
              )}
            </div>

            <div style={{ display: "flex", gap: "16px", marginTop: "32px" }}>
              <button
                type="submit"
                className="btn-primary"
                disabled={submitting || !name.trim() || !templateName.trim() || selectedListIds.length === 0 || (isScheduled && (!scheduleDate || !scheduleTime))}
              >
                {submitting ? (
                  <>
                    <div className="loading-spinner" style={{ width: "18px", height: "18px", borderWidth: "3px" }} />
                    {isScheduled ? "Scheduling..." : "Starting..."}
                  </>
                ) : (
                  <>
                    {isScheduled ? <Calendar size={18} /> : <Megaphone size={18} />}
                    {isScheduled ? "Schedule Campaign" : "Launch Campaign"}
                  </>
                )}
              </button>
              <Link href="/campaigns" className="btn-secondary">
                Cancel
              </Link>
            </div>
          </form>
        </div>

        {/* Right side: Live WhatsApp Preview */}
        <div style={{ width: "380px", flexShrink: 0, position: "sticky", top: "24px" }}>
          <div style={{ background: "#e5ddd5", borderRadius: "16px", overflow: "hidden", boxShadow: "0 4px 16px rgba(0,0,0,0.1)", border: "1px solid #d1d5db" }}>
            {/* Header */}
            <div style={{ background: "#075e54", padding: "14px 16px", color: "white", display: "flex", alignItems: "center", gap: "10px" }}>
              <div style={{ width: "32px", height: "32px", borderRadius: "50%", background: "#fff", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <ImageIcon size={18} color="#075e54" />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: "600", fontSize: "14px" }}>WhatsApp Preview</div>
                <div style={{ fontSize: "11px", opacity: 0.85, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {selectedTemplate ? selectedTemplate.name : "Select a template"}
                </div>
              </div>
              <span style={{ fontSize: "10px", padding: "3px 7px", background: "rgba(255,255,255,0.2)", borderRadius: "4px", fontWeight: "600" }}>
                Preview
              </span>
            </div>

            {/* Chat Wallpaper Area */}
            <div style={{ padding: "18px 14px", backgroundImage: 'url("https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png")', backgroundSize: "cover", minHeight: "360px" }}>
              {selectedTemplate ? (
                <div style={{ background: "white", borderRadius: "10px", padding: "12px", boxShadow: "0 1px 3px rgba(0,0,0,0.12)", maxWidth: "96%", borderTopLeftRadius: "2px" }}>
                  {/* Header Image / Media */}
                  {requiresMediaHeader && (
                    <div style={{ width: "100%", background: "#f1f5f9", borderRadius: "6px", marginBottom: "8px", overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      {previewMediaUrl ? (
                        <img
                          src={previewMediaUrl}
                          alt="Header Preview"
                          style={{ width: "100%", height: "auto", maxHeight: "320px", objectFit: "contain", display: "block", borderRadius: "6px" }}
                        />
                      ) : (
                        <div style={{ padding: "28px 0", display: "flex", flexDirection: "column", alignItems: "center", gap: "6px", color: "#64748b" }}>
                          <ImageIcon size={28} />
                          <span style={{ fontSize: "11px" }}>Attach or select {requiredMediaFormat.toLowerCase()}</span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Template Body */}
                  {bodyComponent && (
                    <div style={{ fontSize: "13.5px", color: "#111", whiteSpace: "pre-wrap", lineHeight: "1.45" }}>
                      {previewBodyText}
                    </div>
                  )}

                  {/* Footer */}
                  {footerComponent && (
                    <div style={{ fontSize: "11px", color: "#667781", marginTop: "6px" }}>
                      {footerComponent.text}
                    </div>
                  )}

                  {/* Message Time & Double Checkmark */}
                  <div style={{ fontSize: "11px", color: "#667781", textAlign: "right", marginTop: "4px", display: "flex", alignItems: "center", justifyContent: "flex-end", gap: "3px" }}>
                    <span>12:00 PM</span>
                    <span style={{ color: "#53bdeb" }}>✓✓</span>
                  </div>

                  {/* Buttons */}
                  {buttonsComponent?.buttons && buttonsComponent.buttons.length > 0 && (
                    <div style={{ borderTop: "1px solid #f0f2f5", marginTop: "8px", paddingTop: "6px", display: "flex", flexDirection: "column", gap: "4px" }}>
                      {buttonsComponent.buttons.map((btn, idx) => (
                        <div key={idx} style={{ padding: "8px 10px", textAlign: "center", color: "#00a884", fontSize: "13px", fontWeight: "500", background: "#f8fafc", borderRadius: "6px" }}>
                          {btn.type === "URL" ? "🔗 " : btn.type === "PHONE_NUMBER" ? "📞 " : "↩️ "}
                          {btn.text}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "300px", color: "#64748b", textAlign: "center", background: "rgba(255,255,255,0.75)", borderRadius: "12px", padding: "20px" }}>
                  <ImageIcon size={36} style={{ opacity: 0.4, marginBottom: "8px" }} />
                  <span style={{ fontSize: "13px", fontWeight: "600" }}>No Template Selected</span>
                  <span style={{ fontSize: "11px", color: "#94a3b8", marginTop: "2px" }}>Choose a template on the left to see live WhatsApp preview</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <MediaPickerModal
        isOpen={isMediaPickerOpen}
        onClose={() => setIsMediaPickerOpen(false)}
        onSelect={(asset) => {
          setSelectedGalleryMedia(asset);
          setMediaFile(null);
        }}
        mediaType={requiredMediaFormat ? requiredMediaFormat.toLowerCase() : "image"}
        title={`Select ${requiredMediaFormat ? requiredMediaFormat.charAt(0) + requiredMediaFormat.slice(1).toLowerCase() : "Media"} from Gallery`}
      />
    </div>
  );
}
