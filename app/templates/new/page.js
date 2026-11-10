"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Megaphone, LayoutTemplate, X, Image as ImageIcon, Video, FileText, FolderOpen, Upload } from "lucide-react";
import api, { normalizeMediaUrl } from "../../lib/api";
import { useToast } from "../../components/ToastProvider";
import MediaPickerModal from "../../components/MediaPickerModal";

export default function NewTemplatePage() {
  const router = useRouter();
  const { showSuccess, showError } = useToast();
  const [name, setName] = useState("");
  const [category, setCategory] = useState("MARKETING");
  const [language, setLanguage] = useState("en_US");
  const [headerType, setHeaderType] = useState("NONE");
  const [headerText, setHeaderText] = useState("");
  const [footerText, setFooterText] = useState("");
  const [sampleFile, setSampleFile] = useState(null);
  const [samplePreview, setSamplePreview] = useState(null);
  const [selectedGalleryMedia, setSelectedGalleryMedia] = useState(null);
  const [isMediaPickerOpen, setIsMediaPickerOpen] = useState(false);
  const [bodyText, setBodyText] = useState("");
  const [buttons, setButtons] = useState([]);

  const handleSampleFileChange = (e) => {
    const file = e.target.files[0] || null;
    setSampleFile(file);
    if (file && (file.type.startsWith("image/") || file.type.startsWith("video/"))) {
      const url = URL.createObjectURL(file);
      setSamplePreview(url);
    } else {
      setSamplePreview(null);
    }
  };
  
  const handleAddButton = (type) => {
    if (buttons.length >= 3) return;
    if (type === "QUICK_REPLY") {
      setButtons([...buttons, { type: "QUICK_REPLY", text: "" }]);
    } else if (type === "URL") {
      setButtons([...buttons, { type: "URL", text: "", url: "" }]);
    } else if (type === "PHONE_NUMBER") {
      setButtons([...buttons, { type: "PHONE_NUMBER", text: "", phone_number: "" }]);
    }
  };

  const handleRemoveButton = (index) => {
    setButtons(buttons.filter((_, i) => i !== index));
  };

  const handleButtonChange = (index, field, value) => {
    const newButtons = [...buttons];
    newButtons[index][field] = value;
    setButtons(newButtons);
  };
  
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!name.trim() || !bodyText.trim()) {
      showError("Please provide a template name and message body.");
      setError("Please provide a template name and message body.");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("name", name.trim());
      formData.append("language", language);
      formData.append("category", category);
      formData.append("text", bodyText.trim());
      formData.append("headerType", headerType);
      if (headerType === "TEXT" && headerText.trim()) {
        formData.append("headerText", headerText.trim());
      }
      if (footerText.trim()) {
        formData.append("footerText", footerText.trim());
      }
      if (buttons && buttons.length > 0) {
        formData.append("buttons", JSON.stringify(buttons));
      }
      if (sampleFile) {
        formData.append("sampleFile", sampleFile);
      } else if (selectedGalleryMedia) {
        formData.append("sampleUrl", selectedGalleryMedia.media_url);
      }

      await api.post("/api/templates", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      const successMsg = `Template "${name.trim()}" submitted to Meta successfully! Approval usually takes 1-2 minutes.`;
      setSuccess(successMsg);
      showSuccess(successMsg);

      setTimeout(() => {
        router.push("/templates");
      }, 2000);
    } catch (err) {
      console.error("Template creation failed:", err);
      const errMsg = err.response?.data?.error || "Failed to submit template to Meta.";
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
          <Link href="/templates" className="btn-secondary" style={{ padding: "10px" }}>
            <ArrowLeft size={20} />
          </Link>
          <h1 className="page-title">Create Custom Template</h1>
        </div>
      </div>

      <div className="page-content" style={{ display: "flex", gap: "24px", height: "calc(100vh - 80px)", overflow: "hidden" }}>
        {/* Left side: Form */}
        <div className="ui-card" style={{ flex: 1, overflowY: "auto", padding: "24px" }}>
          <form onSubmit={handleSubmit}>
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

            {success && (
              <div style={{ padding: "16px", background: "var(--bubble-outbound)", border: "1px solid var(--secondary-accent-muted)", borderRadius: "12px", marginBottom: "24px", color: "var(--secondary-accent)", fontSize: "15px", fontWeight: "600" }}>
                ✅ {success}
              </div>
            )}

            <div className="form-group">
              <label className="form-label">Template Name</label>
              <p style={{ fontSize: "12px", color: "var(--text-muted)", marginBottom: "8px" }}>
                Use only lowercase letters, numbers, and underscores (e.g., `diwali_offer_2026`). No spaces allowed.
              </p>
              <input
                className="form-input"
                type="text"
                placeholder="e.g., diwali_offer_2026"
                value={name}
                onChange={(e) => setName(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "_"))}
                required
              />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "20px" }}>
              <div className="form-group">
                <label className="form-label">Category</label>
                <select
                  className="form-select"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  required
                >
                  <option value="MARKETING">Marketing (Promotions, Offers)</option>
                  <option value="UTILITY">Utility (Updates, Confirmations)</option>
                  <option value="AUTHENTICATION">Authentication (OTPs, Verification)</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Language</label>
                <select
                  className="form-select"
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                  required
                >
                  <option value="en_US">English (US)</option>
                  <option value="en_GB">English (UK)</option>
                  <option value="hi">Hindi</option>
                  <option value="mr">Marathi</option>
                  <option value="gu">Gujarati</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Header (Optional)</label>
                <select
                  className="form-select"
                  value={headerType}
                  onChange={(e) => {
                    setHeaderType(e.target.value);
                    if (e.target.value === "NONE" || e.target.value === "TEXT") {
                      setSampleFile(null);
                      setSamplePreview(null);
                      setSelectedGalleryMedia(null);
                    }
                  }}
                >
                  <option value="NONE">None</option>
                  <option value="TEXT">Text Headline</option>
                  <option value="IMAGE">Image</option>
                  <option value="VIDEO">Video</option>
                  <option value="DOCUMENT">Document (PDF)</option>
                </select>
              </div>
            </div>

            {/* Text Header Input */}
            {headerType === "TEXT" && (
              <div className="form-group" style={{ background: "var(--bg-tertiary)", padding: "16px", borderRadius: "12px", border: "1px solid var(--border-color)", marginBottom: "20px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                  <label className="form-label" style={{ margin: 0 }}>Header Text Headline</label>
                  <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>{headerText.length}/60 chars</span>
                </div>
                <p style={{ fontSize: "12px", color: "var(--text-muted)", marginBottom: "8px" }}>
                  Bold headline shown at the top of the message (Max 60 characters). Meta does not allow emojis or formatting in headers.
                </p>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g., Shubh Deepavali Wishes"
                  maxLength={60}
                  value={headerText}
                  onChange={(e) => setHeaderText(e.target.value)}
                />
              </div>
            )}

            {/* Media Header (Image / Video / Document) */}
            {["IMAGE", "VIDEO", "DOCUMENT"].includes(headerType) && (
              <div style={{ background: "var(--bg-tertiary)", padding: "18px", borderRadius: "12px", border: "1px dashed var(--border-color)", marginBottom: "24px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                  <label className="form-label" style={{ display: "flex", alignItems: "center", gap: "8px", margin: 0 }}>
                    <ImageIcon size={16} color="var(--accent)" />
                    Sample {headerType === "IMAGE" ? "Image" : headerType === "VIDEO" ? "Video" : "Document"} (Optional)
                  </label>
                  <span style={{ fontSize: "11px", fontWeight: "600", padding: "2px 8px", background: "var(--accent-glow)", color: "var(--accent)", borderRadius: "6px" }}>
                    Optional
                  </span>
                </div>
                <p style={{ fontSize: "12px", color: "var(--text-muted)", marginBottom: "14px", lineHeight: "1.5" }}>
                  💡 <strong>Image dalna mandatory nahi hai:</strong> Agar aap koi sample select nahi karenge, toh Meta approval ke liye automatically transparent sample generate ho jayega. Actual campaign run karte waqt aap apni manpasand image choose kar sakte hain.
                </p>

                {selectedGalleryMedia ? (
                  <div style={{ display: "flex", alignItems: "center", gap: "12px", background: "var(--bg-primary)", padding: "10px 14px", borderRadius: "10px", border: "1px solid var(--border-color)" }}>
                    {selectedGalleryMedia.resource_type === "video" || selectedGalleryMedia.media_url?.match(/\.(mp4|mov|webm)$/i) ? (
                      <video
                        src={normalizeMediaUrl(selectedGalleryMedia.media_url)}
                        style={{ width: "54px", height: "54px", borderRadius: "8px", objectFit: "cover" }}
                      />
                    ) : (
                      <img
                        src={normalizeMediaUrl(selectedGalleryMedia.media_url)}
                        alt="Selected"
                        style={{ width: "54px", height: "54px", borderRadius: "8px", objectFit: "cover" }}
                      />
                    )}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: "13px", fontWeight: "600", color: "var(--text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {selectedGalleryMedia.original_name || "Gallery Media"}
                      </div>
                      <span style={{ fontSize: "11px", color: "var(--secondary-accent)", fontWeight: "500" }}>
                        ✓ Selected from Media Gallery ({selectedGalleryMedia.resource_type || "media"})
                      </span>
                    </div>
                    <div style={{ display: "flex", gap: "6px" }}>
                      <button
                        type="button"
                        className="btn-secondary"
                        style={{ fontSize: "12px", padding: "4px 10px" }}
                        onClick={() => setIsMediaPickerOpen(true)}
                      >
                        Change
                      </button>
                      <button
                        type="button"
                        style={{ background: "none", border: "none", color: "var(--danger)", cursor: "pointer", padding: "4px" }}
                        onClick={() => {
                          setSelectedGalleryMedia(null);
                          setSamplePreview(null);
                        }}
                        title="Remove"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  </div>
                ) : sampleFile ? (
                  <div style={{ display: "flex", alignItems: "center", gap: "12px", background: "var(--bg-primary)", padding: "10px 14px", borderRadius: "10px", border: "1px solid var(--border-color)" }}>
                    <div style={{ width: "54px", height: "54px", borderRadius: "8px", background: "var(--accent-glow)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--accent)" }}>
                      {sampleFile.type?.startsWith("video/") ? <Video size={24} /> : <ImageIcon size={24} />}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: "13px", fontWeight: "600", color: "var(--text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {sampleFile.name}
                      </div>
                      <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>
                        {(sampleFile.size / (1024 * 1024)).toFixed(2)} MB • {sampleFile.type?.startsWith("video/") ? "Video File" : "Device File"}
                      </span>
                    </div>
                    <button
                      type="button"
                      style={{ background: "none", border: "none", color: "var(--danger)", cursor: "pointer", padding: "4px" }}
                      onClick={() => {
                        setSampleFile(null);
                        setSamplePreview(null);
                      }}
                      title="Remove"
                    >
                      <X size={16} />
                    </button>
                  </div>
                ) : (
                  <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                    <button
                      type="button"
                      className="btn-primary"
                      style={{ display: "inline-flex", alignItems: "center", gap: "6px", fontSize: "12px", padding: "8px 14px" }}
                      onClick={() => setIsMediaPickerOpen(true)}
                    >
                      <FolderOpen size={15} />
                      <span>Choose from Media Gallery</span>
                    </button>

                    <label
                      className="btn-secondary"
                      style={{ display: "inline-flex", alignItems: "center", gap: "6px", fontSize: "12px", padding: "8px 14px", cursor: "pointer" }}
                    >
                      <Upload size={15} />
                      <span>Upload from Device</span>
                      <input
                        type="file"
                        style={{ display: "none" }}
                        accept={
                          headerType === "IMAGE"
                            ? "image/*"
                            : headerType === "VIDEO"
                            ? "video/*"
                            : "application/pdf"
                        }
                        onChange={(e) => {
                          handleSampleFileChange(e);
                          setSelectedGalleryMedia(null);
                        }}
                      />
                    </label>
                  </div>
                )}
              </div>
            )}

            <div className="form-group">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                <label className="form-label" style={{ margin: 0 }}>Message Body</label>
                <div style={{ display: "flex", gap: "6px" }}>
                  <button
                    type="button"
                    onClick={() => setBodyText((prev) => prev + " {{1}} ")}
                    style={{ fontSize: "11px", padding: "3px 8px", borderRadius: "6px", background: "var(--bg-tertiary)", border: "1px solid var(--border-color)", color: "var(--accent)", fontWeight: 600, cursor: "pointer" }}
                  >
                    + {"{{1}}"} Name
                  </button>
                  <button
                    type="button"
                    onClick={() => setBodyText((prev) => prev + " {{2}} ")}
                    style={{ fontSize: "11px", padding: "3px 8px", borderRadius: "6px", background: "var(--bg-tertiary)", border: "1px solid var(--border-color)", color: "var(--accent)", fontWeight: 600, cursor: "pointer" }}
                  >
                    + {"{{2}}"} Custom
                  </button>
                  <button
                    type="button"
                    onClick={() => setBodyText((prev) => prev + " *bold* ")}
                    style={{ fontSize: "11px", padding: "3px 8px", borderRadius: "6px", background: "var(--bg-tertiary)", border: "1px solid var(--border-color)", color: "var(--text-primary)", fontWeight: 700, cursor: "pointer" }}
                  >
                    *B*
                  </button>
                  <button
                    type="button"
                    onClick={() => setBodyText((prev) => prev + " _italic_ ")}
                    style={{ fontSize: "11px", padding: "3px 8px", borderRadius: "6px", background: "var(--bg-tertiary)", border: "1px solid var(--border-color)", color: "var(--text-primary)", fontStyle: "italic", fontWeight: 600, cursor: "pointer" }}
                  >
                    _I_
                  </button>
                </div>
              </div>
              <p style={{ fontSize: "12px", color: "var(--text-muted)", marginBottom: "8px" }}>
                Enter the text you want to send. Use {"{{1}}"}, {"{{2}}"} for personalized fields like name or custom details.
              </p>
              <textarea
                className="form-input"
                rows={6}
                placeholder="Hello {{1}}! We have a special festive announcement for you..."
                value={bodyText}
                onChange={(e) => setBodyText(e.target.value)}
                required
                style={{ resize: "vertical" }}
              />
            </div>

            {/* Footer Text (Optional) */}
            <div className="form-group" style={{ marginTop: "18px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                <label className="form-label" style={{ margin: 0 }}>Footer Text (Optional)</label>
                <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>{footerText.length}/60 chars</span>
              </div>
              <p style={{ fontSize: "12px", color: "var(--text-muted)", marginBottom: "8px" }}>
                Small muted text shown at the bottom of the message (Max 60 characters).
              </p>
              <input
                type="text"
                className="form-input"
                placeholder="e.g., Assudani Developers • Reply STOP to unsubscribe"
                maxLength={60}
                value={footerText}
                onChange={(e) => setFooterText(e.target.value)}
              />
            </div>

            <div className="form-group" style={{ marginTop: "24px" }}>
              <label className="form-label">Buttons (Optional)</label>
              <p style={{ fontSize: "12px", color: "var(--text-muted)", marginBottom: "16px" }}>
                Add up to 3 interactive buttons (Quick Replies or Calls to Action).
              </p>
              
              {buttons.map((btn, idx) => (
                <div key={idx} style={{ padding: "16px", background: "var(--bg-tertiary)", border: "1px solid var(--border-color)", borderRadius: "8px", marginBottom: "12px", position: "relative" }}>
                  <button type="button" onClick={() => handleRemoveButton(idx)} style={{ position: "absolute", top: "12px", right: "12px", background: "none", border: "none", color: "red", cursor: "pointer" }}>
                    <X size={16} />
                  </button>
                  <div style={{ fontWeight: "600", fontSize: "12px", color: "var(--text-secondary)", marginBottom: "12px" }}>
                    {btn.type.replace("_", " ")} BUTTON
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: btn.type === "QUICK_REPLY" ? "1fr" : "1fr 1fr", gap: "12px" }}>
                    <div>
                      <input type="text" className="form-input" placeholder="Button Text (Max 25 chars)" value={btn.text} onChange={(e) => handleButtonChange(idx, "text", e.target.value)} maxLength={25} required />
                    </div>
                    {btn.type === "URL" && (
                      <div>
                        <input type="url" className="form-input" placeholder="https://example.com" value={btn.url} onChange={(e) => handleButtonChange(idx, "url", e.target.value)} required />
                      </div>
                    )}
                    {btn.type === "PHONE_NUMBER" && (
                      <div>
                        <input type="text" className="form-input" placeholder="+1234567890" value={btn.phone_number} onChange={(e) => handleButtonChange(idx, "phone_number", e.target.value)} required />
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {buttons.length < 3 && (
                <div style={{ display: "flex", gap: "8px", marginTop: "12px" }}>
                  <button type="button" className="btn-secondary" onClick={() => handleAddButton("QUICK_REPLY")} style={{ fontSize: "13px", padding: "6px 12px" }}>+ Quick Reply</button>
                  <button type="button" className="btn-secondary" onClick={() => handleAddButton("URL")} style={{ fontSize: "13px", padding: "6px 12px" }}>+ URL Link</button>
                  <button type="button" className="btn-secondary" onClick={() => handleAddButton("PHONE_NUMBER")} style={{ fontSize: "13px", padding: "6px 12px" }}>+ Phone</button>
                </div>
              )}
            </div>

            <div style={{ display: "flex", gap: "16px", marginTop: "40px", paddingBottom: "24px" }}>
              <button
                type="submit"
                className="btn-primary"
                disabled={submitting || !name.trim() || !bodyText.trim()}
              >
                {submitting ? (
                  <>
                    <div className="loading-spinner" style={{ width: "18px", height: "18px", borderWidth: "3px" }} />
                    Submitting...
                  </>
                ) : (
                  <>
                    <LayoutTemplate size={18} />
                    Submit to Meta
                  </>
                )}
              </button>
              <Link href="/templates" className="btn-secondary">
                Cancel
              </Link>
            </div>
          </form>
        </div>

        {/* Right side: WhatsApp Preview */}
        <div style={{ width: '400px', flexShrink: 0, display: 'flex', flexDirection: 'column' }}>
          <div style={{ background: '#e5ddd5', borderRadius: '16px', height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', border: '1px solid #d1d5db' }}>
            {/* Header */}
            <div style={{ background: '#075e54', padding: '16px', color: 'white', display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <ImageIcon size={20} color="#075e54" />
              </div>
              <div>
                <div style={{ fontWeight: '600', fontSize: '15px' }}>WhatsApp Preview</div>
                <div style={{ fontSize: '12px', opacity: 0.8 }}>Business Account</div>
              </div>
            </div>
            
            {/* Chat area */}
            <div style={{ flex: 1, padding: '20px', backgroundImage: 'url("https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png")', backgroundSize: 'cover', overflowY: 'auto' }}>
              
              <div style={{ background: 'white', borderRadius: '8px', padding: '12px', boxShadow: '0 1px 2px rgba(0,0,0,0.1)', maxWidth: '90%', borderTopLeftRadius: '0' }}>
                
                {headerType === 'TEXT' && headerText && (
                  <div style={{ fontWeight: '700', fontSize: '15px', color: '#111827', marginBottom: '8px', borderBottom: '1px solid #f1f5f9', paddingBottom: '4px' }}>
                    {headerText}
                  </div>
                )}
                {headerType === 'IMAGE' && (
                  <div style={{ width: '100%', background: '#f1f5f9', borderRadius: '6px', marginBottom: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b', overflow: 'hidden', minHeight: samplePreview ? 'auto' : '140px' }}>
                    {samplePreview ? (
                      <img
                        src={samplePreview}
                        alt="Header Preview"
                        style={{ width: '100%', height: 'auto', maxHeight: '340px', objectFit: 'contain', display: 'block', borderRadius: '6px' }}
                      />
                    ) : (
                      <div style={{ padding: '36px 0', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
                        <ImageIcon size={32} />
                        <span style={{ fontSize: '11px', color: '#94a3b8' }}>Image Header</span>
                      </div>
                    )}
                  </div>
                )}
                {headerType === 'VIDEO' && (
                  <div style={{ width: '100%', background: '#0f172a', borderRadius: '6px', marginBottom: '8px', overflow: 'hidden', minHeight: samplePreview ? 'auto' : '140px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {samplePreview ? (
                      <video
                        src={samplePreview}
                        controls
                        playsInline
                        style={{ width: '100%', maxHeight: '280px', display: 'block', borderRadius: '6px' }}
                      />
                    ) : (
                      <div style={{ padding: '36px 0', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', color: '#94a3b8' }}>
                        <Video size={32} />
                        <span style={{ fontSize: '11px' }}>Video Header (Sample MP4)</span>
                      </div>
                    )}
                  </div>
                )}
                {headerType === 'DOCUMENT' && <div style={{ width: '100%', padding: '16px', background: '#e2e8f0', borderRadius: '6px', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '12px' }}><FileText color="#64748b" size={24} /><span style={{ fontSize: '14px', color: '#475569', fontWeight: '500' }}>Document.pdf</span></div>}
                
                <div style={{ fontSize: '14px', color: '#111', whiteSpace: 'pre-wrap', lineHeight: '1.4' }}>
                  {bodyText || 'Your message text will appear here...'}
                </div>
                
                {footerText && (
                  <div style={{ fontSize: '12px', color: '#667781', marginTop: '6px' }}>
                    {footerText}
                  </div>
                )}
                
                <div style={{ fontSize: '11px', color: '#667781', textAlign: 'right', marginTop: '4px' }}>12:00 PM</div>
              </div>

              {buttons.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '4px', maxWidth: '90%' }}>
                  {buttons.map((btn, i) => (
                    <div key={i} style={{ background: 'white', padding: '10px', borderRadius: '8px', textAlign: 'center', fontSize: '14px', color: '#00a884', fontWeight: '500', boxShadow: '0 1px 2px rgba(0,0,0,0.1)' }}>
                      {btn.type === "URL" && "🔗 "}
                      {btn.type === "PHONE_NUMBER" && "📞 "}
                      {btn.text || 'Button'}
                    </div>
                  ))}
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
          setSampleFile(null);
          setSamplePreview(normalizeMediaUrl(asset.media_url));
        }}
        mediaType={headerType === "VIDEO" ? "video" : headerType === "DOCUMENT" ? "document" : "image"}
        title={`Select Sample ${headerType === "VIDEO" ? "Video" : headerType === "DOCUMENT" ? "Document" : "Image"} from Gallery`}
      />
    </div>
  );
}
