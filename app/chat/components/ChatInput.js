"use client";

import { useEffect, useRef, useState } from "react";
import { Send, AlertTriangle, LayoutTemplate, Paperclip, Image as ImageIcon, FolderOpen, Upload, X } from "lucide-react";
import { sendMessage, sendTemplate, getTemplates, sendMedia, uploadMedia, normalizeMediaUrl } from "../../lib/api";
import { useToast } from "../../components/ToastProvider";
import MediaPickerModal from "../../components/MediaPickerModal";

export default function ChatInput({ contactId, windowInfo, onMessageSent }) {
  const { showError, showWarning, showSuccess } = useToast();
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [showFileModal, setShowFileModal] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [filePreviewUrl, setFilePreviewUrl] = useState("");
  const filePreviewUrlRef = useRef("");
  const [templateName, setTemplateName] = useState("");
  const [languageCode, setLanguageCode] = useState("en_US");
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [templateParams, setTemplateParams] = useState({});
  const [templateSending, setTemplateSending] = useState(false);
  const [templates, setTemplates] = useState([]);
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  const [isMediaPickerOpen, setIsMediaPickerOpen] = useState(false);
  const [uploadingHeaderMedia, setUploadingHeaderMedia] = useState(false);

  const isWindowClosed = windowInfo && !windowInfo.open;

  useEffect(() => () => {
    if (filePreviewUrlRef.current) URL.revokeObjectURL(filePreviewUrlRef.current);
  }, []);

  const clearSelectedFile = () => {
    if (filePreviewUrlRef.current) {
      URL.revokeObjectURL(filePreviewUrlRef.current);
      filePreviewUrlRef.current = "";
    }
    setFilePreviewUrl("");
    setSelectedFile(null);
    setShowFileModal(false);
  };

  const handleSend = async () => {
    if (!text.trim() || sending || isWindowClosed) return;

    setSending(true);
    try {
      const res = await sendMessage(contactId, text.trim());
      onMessageSent(res.data);
      setText("");
    } catch (err) {
      console.error("Send failed:", err);
      if (err.response?.data?.window_closed) {
        // Window just closed - UI will update via socket
        showWarning("24-hour window has closed. Please send a template message to restart the conversation.");
      } else {
        showError(err.response?.data?.error || "Failed to send message. Please try again.");
      }
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handlePaste = (e) => {
    if (isWindowClosed) return;
    const items = e.clipboardData?.items;
    if (!items) return;

    for (let i = 0; i < items.length; i++) {
      if (items[i].type && items[i].type.startsWith("image/")) {
        const file = items[i].getAsFile();
        if (file) {
          e.preventDefault();
          if (filePreviewUrlRef.current) URL.revokeObjectURL(filePreviewUrlRef.current);
          const previewUrl = URL.createObjectURL(file);
          filePreviewUrlRef.current = previewUrl;
          setFilePreviewUrl(previewUrl);
          setSelectedFile(file);
          setShowFileModal(true);
          return;
        }
      }
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file || isWindowClosed) return;
    
    if (filePreviewUrlRef.current) URL.revokeObjectURL(filePreviewUrlRef.current);
    const previewUrl = URL.createObjectURL(file);
    filePreviewUrlRef.current = previewUrl;
    setFilePreviewUrl(previewUrl);
    setSelectedFile(file);
    setShowFileModal(true);
    e.target.value = null; // Reset input
  };

  const handleConfirmSendFile = async () => {
    if (!selectedFile || isWindowClosed) return;
    
    setSending(true);
    setShowFileModal(false);
    try {
      const res = await sendMedia(contactId, selectedFile);
      onMessageSent(res.data);
      showSuccess("Media dispatched successfully.");
    } catch (err) {
      console.error("Media send failed:", err);
      showError(err.response?.data?.error || "Failed to send media");
    } finally {
      setSending(false);
      clearSelectedFile();
    }
  };

  const openTemplateModal = async () => {
    setShowTemplateModal(true);
    if (templates.length === 0) {
      setLoadingTemplates(true);
      try {
        const res = await getTemplates();
        const approvedOnly = (res.data || []).filter(t => t.status === 'APPROVED');
        setTemplates(approvedOnly);
      } catch (err) {
        console.error("Failed to fetch templates:", err);
      } finally {
        setLoadingTemplates(false);
      }
    }
  };

  const handleUploadHeaderMedia = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploadingHeaderMedia(true);
      const formData = new FormData();
      formData.append("file", file);
      const res = await uploadMedia(formData);
      const publicUrl = normalizeMediaUrl(res.data.media_url);
      setTemplateParams((prev) => ({
        ...prev,
        header_media: publicUrl,
        header_media_name: file.name,
      }));
      showSuccess(`"${file.name}" uploaded to gallery!`);
    } catch (err) {
      console.error("Header upload failed:", err);
      showError(err.response?.data?.error || "Failed to upload file");
    } finally {
      setUploadingHeaderMedia(false);
      e.target.value = null;
    }
  };

  const handleSelectGalleryMedia = (asset) => {
    const publicUrl = normalizeMediaUrl(asset.media_url);
    setTemplateParams((prev) => ({
      ...prev,
      header_media: publicUrl,
      header_media_name: asset.original_name,
    }));
  };

  const handleSendTemplate = async () => {
    if (!templateName.trim() || templateSending) return;

    const apiComponents = [];

    if (selectedTemplate) {
      const headerComp = selectedTemplate.components?.find((c) => c.type === "HEADER");
      if (headerComp && ["IMAGE", "VIDEO", "DOCUMENT"].includes(headerComp.format)) {
        if (!templateParams.header_media) {
          showError(`Please select a ${headerComp.format.toLowerCase()} for the template header`);
          return;
        }
        apiComponents.push({
          type: "header",
          parameters: [
            {
              type: headerComp.format.toLowerCase(),
              [headerComp.format.toLowerCase()]: { link: templateParams.header_media },
            },
          ],
        });
      }

      const bodyComp = selectedTemplate.components?.find(c => c.type === "BODY");
      if (bodyComp && bodyComp.text.includes("{{")) {
        const count = (bodyComp.text.match(/\{\{\d+\}\}/g) || []).length;
        const bodyParams = [];
        for (let i = 1; i <= count; i++) {
          if (!templateParams[`body_${i}`]) {
            showError(`Please provide a value for {{${i}}}`);
            return;
          }
          bodyParams.push({
            type: "text",
            text: templateParams[`body_${i}`]
          });
        }
        apiComponents.push({
          type: "body",
          parameters: bodyParams
        });
      }
    }

    setTemplateSending(true);
    try {
      const channelId = selectedTemplate?.usable_on?.[0]?.channel_id || null;
      const res = await sendTemplate(contactId, templateName.trim(), languageCode, apiComponents, channelId);
      onMessageSent(res.data);
      showSuccess(`Template "${templateName}" sent successfully!`);
      setTemplateName("");
      setSelectedTemplate(null);
      setTemplateParams({});
      setShowTemplateModal(false);
    } catch (err) {
      console.error("Template send failed:", err);
      showError(err.response?.data?.error || "Failed to send template");
    } finally {
      setTemplateSending(false);
    }
  };

  return (
    <div className="chat-input-container">
      {}
      {isWindowClosed && (
        <div className="window-warning">
          <AlertTriangle size={18} style={{ color: "var(--warning-text)", minWidth: "18px" }} />
          <span className="window-warning-text">
            24-hour window closed. Send a template to restart chat.
          </span>
          <button
            className="template-btn"
            onClick={openTemplateModal}
          >
            Send Template
          </button>
        </div>
      )}

      {}
      <div className="chat-input-wrapper">
        <textarea
          className="chat-input"
          placeholder={
            isWindowClosed
              ? "Window closed — use template to restart"
              : "Type a message..."
          }
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          disabled={isWindowClosed || sending}
          rows={1}
        />
        <button
          className="send-btn"
          onClick={handleSend}
          disabled={!text.trim() || isWindowClosed || sending}
          title="Send message"
        >
          <Send size={18} />
        </button>
        <label
          className="send-btn"
          title="Send Media"
          style={{ 
            marginLeft: "8px", background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text-primary)", 
            cursor: isWindowClosed || sending ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center",
            opacity: isWindowClosed || sending ? 0.6 : 1
          }}
        >
          <Paperclip size={18} />
          <input 
            type="file" 
            style={{ display: "none" }} 
            onChange={handleFileChange}
            accept="*/*"
            disabled={isWindowClosed || sending}
          />
        </label>
        <button
          className="send-btn"
          onClick={openTemplateModal}
          disabled={templateSending}
          title="Send Template"
          style={{ marginLeft: "8px", background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text-primary)" }}
        >
          <LayoutTemplate size={18} />
        </button>
      </div>

      {}
      {showTemplateModal && (
        <div
          className="modal-overlay"
          onClick={() => setShowTemplateModal(false)}
        >
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3 className="modal-title">Send Template Message</h3>
            <div className="form-group">
              <label className="form-label">Template Name</label>
              {loadingTemplates ? (
                <div style={{ padding: "10px", color: "var(--text-secondary)", fontSize: "14px" }}>
                  Loading templates...
                </div>
              ) : templates.length === 0 ? (
                <div style={{ padding: "10px", color: "var(--warning-text)", fontSize: "14px" }}>
                  No approved templates found.
                </div>
              ) : (
                <select
                  className="form-input form-select"
                  value={templateName}
                  onChange={(e) => {
                    const selected = templates.find(t => t.name === e.target.value);
                    if (selected) {
                      setTemplateName(selected.name);
                      setLanguageCode(selected.language);
                      setSelectedTemplate(selected);
                      setTemplateParams({});
                    } else {
                      setTemplateName("");
                      setLanguageCode("en_US");
                      setSelectedTemplate(null);
                      setTemplateParams({});
                    }
                  }}
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

            {selectedTemplate && selectedTemplate.components && (
              <div style={{ marginTop: "16px", display: "flex", flexDirection: "column", gap: "12px" }}>
                {selectedTemplate.components.map(comp => {
                  if (comp.type === "HEADER" && ["IMAGE", "VIDEO", "DOCUMENT"].includes(comp.format)) {
                    const mediaLabel = comp.format === "IMAGE" ? "Image" : comp.format === "VIDEO" ? "Video" : "Document";
                    const hasMedia = !!templateParams["header_media"];

                    return (
                      <div key="header" style={{ background: "var(--bg-tertiary)", padding: "14px", borderRadius: "10px", border: "1px dashed var(--border-color)" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                          <label className="form-label" style={{ margin: 0, display: "flex", alignItems: "center", gap: "6px" }}>
                            <ImageIcon size={16} color="var(--accent)" />
                            {mediaLabel} Header (Required)
                          </label>
                          <span style={{ fontSize: "11px", fontWeight: "600", padding: "2px 8px", background: "var(--accent-glow)", color: "var(--accent)", borderRadius: "6px" }}>
                            Required
                          </span>
                        </div>
                        <p style={{ fontSize: "12px", color: "var(--text-muted)", marginBottom: "12px" }}>
                          Choose an image from your software&apos;s Media Gallery or upload from your device.
                        </p>

                        {hasMedia ? (
                          <div style={{ display: "flex", alignItems: "center", gap: "12px", background: "var(--bg-primary)", padding: "8px 12px", borderRadius: "8px", border: "1px solid var(--border-color)" }}>
                            {comp.format === "IMAGE" ? (
                              <img
                                src={templateParams["header_media"]}
                                alt="Header"
                                style={{ width: "48px", height: "48px", borderRadius: "6px", objectFit: "cover" }}
                              />
                            ) : (
                              <div style={{ width: "48px", height: "48px", borderRadius: "6px", background: "var(--accent-glow)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--accent)" }}>
                                <ImageIcon size={22} />
                              </div>
                            )}
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontSize: "13px", fontWeight: "600", color: "var(--text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                {templateParams["header_media_name"] || "Selected Media"}
                              </div>
                              <span style={{ fontSize: "11px", color: "var(--secondary-accent)", fontWeight: "500" }}>
                                ✓ Ready to send
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
                                  setTemplateParams((prev) => {
                                    const next = { ...prev };
                                    delete next.header_media;
                                    delete next.header_media_name;
                                    return next;
                                  });
                                }}
                                title="Remove"
                              >
                                <X size={16} />
                              </button>
                            </div>
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
                              style={{ display: "inline-flex", alignItems: "center", gap: "6px", fontSize: "12px", padding: "8px 14px", cursor: uploadingHeaderMedia ? "not-allowed" : "pointer" }}
                            >
                              <Upload size={15} />
                              <span>{uploadingHeaderMedia ? "Uploading..." : "Upload from Device"}</span>
                              <input
                                type="file"
                                style={{ display: "none" }}
                                accept={
                                  comp.format === "IMAGE"
                                    ? "image/*"
                                    : comp.format === "VIDEO"
                                    ? "video/*"
                                    : "application/pdf"
                                }
                                onChange={handleUploadHeaderMedia}
                                disabled={uploadingHeaderMedia}
                              />
                            </label>
                          </div>
                        )}
                      </div>
                    );
                  }
                  if (comp.type === "BODY" && comp.text.includes("{{")) {
                    const count = (comp.text.match(/\{\{\d+\}\}/g) || []).length;
                    return Array.from({ length: count }).map((_, i) => (
                      <div key={`body_${i+1}`}>
                        <label className="form-label">Body Variable {`{{${i+1}}}`}</label>
                        <input 
                          className="form-input" 
                          placeholder={`Value for {{${i+1}}}`}
                          value={templateParams[`body_${i+1}`] || ""}
                          onChange={(e) => setTemplateParams({...templateParams, [`body_${i+1}`]: e.target.value})}
                        />
                      </div>
                    ));
                  }
                  return null;
                })}
              </div>
            )}

            {selectedTemplate && (
              <div style={{ marginTop: "18px", padding: "14px", background: "#e5ddd5", borderRadius: "12px", border: "1px solid #d1d5db" }}>
                <div style={{ fontSize: "11px", fontWeight: "600", color: "#075e54", marginBottom: "8px", textTransform: "uppercase" }}>
                  Live Message Preview:
                </div>
                <div style={{ background: "white", borderRadius: "8px", padding: "10px", boxShadow: "0 1px 2px rgba(0,0,0,0.1)", maxWidth: "100%" }}>
                  {selectedTemplate.components?.find((c) => c.type === "HEADER")?.format === "IMAGE" && (
                    <div style={{ width: "100%", background: "#f1f5f9", borderRadius: "6px", marginBottom: "8px", overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      {templateParams["header_media"] ? (
                        <img src={templateParams["header_media"]} alt="Header" style={{ width: "100%", maxHeight: "200px", objectFit: "contain", borderRadius: "6px" }} />
                      ) : (
                        <div style={{ padding: "20px 0", color: "#64748b", fontSize: "12px", display: "flex", alignItems: "center", gap: "6px" }}>
                          <ImageIcon size={18} />
                          <span>Image Header</span>
                        </div>
                      )}
                    </div>
                  )}

                  {selectedTemplate.components?.find((c) => c.type === "BODY") && (
                    <div style={{ fontSize: "13px", color: "#111", whiteSpace: "pre-wrap", lineHeight: "1.4" }}>
                      {selectedTemplate.components
                        .find((c) => c.type === "BODY")
                        .text.replace(/\{\{(\d+)\}\}/g, (_, num) => templateParams[`body_${num}`] || `{{${num}}}`)}
                    </div>
                  )}

                  {selectedTemplate.components?.find((c) => c.type === "FOOTER") && (
                    <div style={{ fontSize: "11px", color: "#667781", marginTop: "4px" }}>
                      {selectedTemplate.components.find((c) => c.type === "FOOTER").text}
                    </div>
                  )}

                  <div style={{ fontSize: "10px", color: "#667781", textAlign: "right", marginTop: "4px" }}>12:00 PM</div>
                </div>
              </div>
            )}

            <div className="modal-actions" style={{ marginTop: "24px" }}>
              <button
                className="btn-secondary"
                onClick={() => setShowTemplateModal(false)}
              >
                Cancel
              </button>
              <button
                className="btn-primary"
                onClick={handleSendTemplate}
                disabled={!templateName.trim() || templateSending}
              >
                {templateSending ? "Sending..." : "Send Template"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* File Confirmation Modal */}
      {showFileModal && (
        <div
          className="modal-overlay"
          onClick={clearSelectedFile}
        >
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3 className="modal-title">Send Media/Document</h3>
            <div style={{ margin: "20px 0", color: "var(--text-primary)" }}>
              <p>Are you sure you want to send this file?</p>
              <div style={{ marginTop: "12px", padding: "12px", background: "var(--bg-tertiary)", borderRadius: "8px", border: "1px solid var(--border-color)", display: "flex", alignItems: "center", gap: "12px" }}>
                <Paperclip size={20} className="text-muted" />
                <span style={{ fontWeight: 500, wordBreak: "break-all" }}>{selectedFile?.name}</span>
                <span className="text-muted" style={{ fontSize: "12px", marginLeft: "auto" }}>
                  {(selectedFile?.size / 1024 / 1024).toFixed(2)} MB
                </span>
              </div>
              {selectedFile && filePreviewUrl && (
                <div style={{ marginTop: "12px", padding: "12px", background: "var(--bg-primary)", borderRadius: "8px", border: "1px solid var(--border-color)", textAlign: "center" }}>
                  {selectedFile.type.startsWith("image/") ? (
                    <img
                      src={filePreviewUrl}
                      alt={`Preview of ${selectedFile.name}`}
                      style={{ display: "block", maxWidth: "100%", maxHeight: "280px", objectFit: "contain", margin: "0 auto", borderRadius: "6px" }}
                    />
                  ) : selectedFile.type.startsWith("video/") ? (
                    <video
                      src={filePreviewUrl}
                      controls
                      style={{ display: "block", maxWidth: "100%", maxHeight: "280px", margin: "0 auto", borderRadius: "6px" }}
                    />
                  ) : selectedFile.type.startsWith("audio/") ? (
                    <audio src={filePreviewUrl} controls style={{ width: "100%" }} />
                  ) : selectedFile.type === "application/pdf" || selectedFile.name.toLowerCase().endsWith(".pdf") ? (
                    <iframe
                      src={filePreviewUrl}
                      title={`Preview of ${selectedFile.name}`}
                      style={{ width: "100%", height: "280px", border: 0, borderRadius: "6px" }}
                    />
                  ) : (
                    <div style={{ padding: "24px 12px", color: "var(--text-secondary)" }}>
                      <Paperclip size={32} style={{ margin: "0 auto 8px" }} />
                      <p>Preview is not available for this file type.</p>
                      <a
                        href={filePreviewUrl}
                        download={selectedFile.name}
                        style={{ display: "inline-block", marginTop: "8px", color: "var(--accent)" }}
                      >
                        Open or download preview
                      </a>
                    </div>
                  )}
                </div>
              )}
            </div>
            <div className="modal-actions" style={{ marginTop: "24px" }}>
              <button
                className="btn-secondary"
                onClick={clearSelectedFile}
              >
                Cancel
              </button>
              <button
                className="btn-primary"
                onClick={handleConfirmSendFile}
              >
                Send File
              </button>
            </div>
          </div>
        </div>
      )}

      <MediaPickerModal
        isOpen={isMediaPickerOpen}
        onClose={() => setIsMediaPickerOpen(false)}
        onSelect={handleSelectGalleryMedia}
        mediaType={selectedTemplate?.components?.find((c) => c.type === "HEADER")?.format?.toLowerCase() || "image"}
        title="Select Header Media from Gallery"
      />
    </div>
  );
}
