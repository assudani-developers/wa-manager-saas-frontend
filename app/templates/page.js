"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { getTemplates, deleteTemplate } from "../lib/api";
import { LayoutTemplate, CheckCircle2, XCircle, Clock, Trash2, Smartphone, CheckCheck, AlertTriangle, X } from "lucide-react";
import { useToast } from "../components/ToastProvider";

export default function TemplateLibraryPage() {
  const { showSuccess, showError } = useToast();
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [templateToDelete, setTemplateToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    fetchTemplates();
  }, []);

  async function fetchTemplates() {
    try {
      setLoading(true);
      setError("");
      const res = await getTemplates({ refresh: "true" });
      setTemplates(res.data || []);
    } catch (err) {
      setError("Failed to fetch templates. Make sure your Meta API credentials are correct.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  const handleDeleteConfirm = async () => {
    if (!templateToDelete) return;
    setIsDeleting(true);
    try {
      await deleteTemplate(templateToDelete.name, templateToDelete.id);
      setTemplates((prev) => prev.filter((t) => t.name !== templateToDelete.name));
      showSuccess(`Template "${templateToDelete.name}" deleted from WhatsApp Meta Cloud successfully.`);
      setTemplateToDelete(null);
    } catch (err) {
      console.error("Template deletion error:", err);
      const errMsg = err.response?.data?.error || err.message || "Failed to delete template from Meta.";
      showError(errMsg);
    } finally {
      setIsDeleting(false);
    }
  };

  const renderStatus = (status) => {
    switch (status) {
      case "APPROVED":
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800"><CheckCircle2 size={12} /> Approved</span>;
      case "PENDING":
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800"><Clock size={12} /> Pending</span>;
      case "REJECTED":
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800"><XCircle size={12} /> Rejected</span>;
      default:
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">{status}</span>;
    }
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">Template Library</h1>
          <p style={{ fontSize: "13px", color: "var(--text-muted)", marginTop: "4px" }}>
            WhatsApp Meta Cloud pre-approved message templates. View which mobile number created each template and where it can be used.
          </p>
        </div>
        <div style={{ display: "flex", gap: "12px" }}>
          <button onClick={fetchTemplates} disabled={loading} className="btn-secondary">
            Refresh
          </button>
          <Link href="/templates/new" className="btn-primary">
            + Create Template
          </Link>
        </div>
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
        ) : templates.length === 0 ? (
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
              <LayoutTemplate size={32} />
            </div>
            <h2
              style={{
                fontSize: "20px",
                fontWeight: "600",
                color: "var(--text-primary)",
                marginBottom: "8px",
              }}
            >
              No templates found
            </h2>
            <p style={{ fontSize: "14px", maxWidth: "400px", lineHeight: 1.6, marginBottom: "20px" }}>
              Create your first custom template to start sending messages.
            </p>
            <Link href="/templates/new" className="btn-primary">
              Create Template
            </Link>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: "24px" }}>
            {templates.map((template) => {
              const createdForPhone = template.created_for?.phone_number || "Active Sender";
              const createdForName = template.created_for?.name || "WhatsApp Business";
              const usableList = template.usable_on && template.usable_on.length > 0
                ? template.usable_on
                : [{ phone_number: createdForPhone, name: createdForName }];

              return (
                <div
                  key={template.id || template.name}
                  className="ui-card animate-fade-in"
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    padding: "0",
                    border: "1px solid var(--border-color)",
                    borderRadius: "14px",
                    overflow: "hidden",
                    boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
                  }}
                >
                  {/* Card Header */}
                  <div
                    className="ui-card-header"
                    style={{
                      padding: "16px 20px",
                      borderBottom: "1px solid var(--border-color)",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "flex-start",
                      gap: "12px",
                      background: "var(--bg-secondary)",
                    }}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <h3 className="ui-card-title" style={{ wordBreak: "break-word", fontSize: "16px", fontWeight: "700" }}>
                        {template.name}
                      </h3>
                      <div style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "4px", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                        {template.language} • {template.category}
                      </div>
                    </div>
                    <div style={{ flexShrink: 0 }}>
                      {renderStatus(template.status)}
                    </div>
                  </div>

                  {/* Channel & Mobile Mapping Info */}
                  <div style={{ padding: "12px 18px", background: "rgba(0, 0, 0, 0.02)", borderBottom: "1px solid var(--border-color)", display: "flex", flexDirection: "column", gap: "8px" }}>
                    {/* Created For Mobile Number */}
                    <div
                      style={{
                        padding: "8px 12px",
                        background: "rgba(16, 185, 129, 0.08)",
                        border: "1px solid rgba(16, 185, 129, 0.25)",
                        borderRadius: "8px",
                        fontSize: "12px",
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                      }}
                    >
                      <Smartphone size={15} style={{ color: "var(--accent)", flexShrink: 0 }} />
                      <div style={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        <span style={{ fontWeight: "600", color: "var(--text-primary)" }}>Banaya Gaya: </span>
                        <span style={{ color: "var(--accent)", fontWeight: "600" }}>
                          {createdForName} ({createdForPhone})
                        </span>
                      </div>
                    </div>

                    {/* Usable On Mobile Numbers */}
                    <div
                      style={{
                        padding: "8px 12px",
                        background: "rgba(59, 130, 246, 0.07)",
                        border: "1px solid rgba(59, 130, 246, 0.22)",
                        borderRadius: "8px",
                        fontSize: "12px",
                        display: "flex",
                        alignItems: "flex-start",
                        gap: "8px",
                      }}
                    >
                      <CheckCheck size={15} style={{ color: "#2563eb", marginTop: "2px", flexShrink: 0 }} />
                      <div style={{ flex: 1 }}>
                        <span style={{ fontWeight: "600", color: "var(--text-primary)" }}>Use Ho Sakta Hai: </span>
                        <div style={{ marginTop: "4px", display: "flex", flexWrap: "wrap", gap: "6px" }}>
                          {usableList.map((u, uIdx) => (
                            <span
                              key={uIdx}
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "4px",
                                background: "white",
                                border: "1px solid rgba(59, 130, 246, 0.25)",
                                padding: "2px 8px",
                                borderRadius: "12px",
                                fontSize: "11px",
                                fontWeight: "600",
                                color: "#1d4ed8",
                              }}
                            >
                              📱 {u.phone_number} {u.name ? `(${u.name})` : ""}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Template Body / Components Preview */}
                  <div style={{ padding: "18px 20px", flex: "1", background: "var(--bg-tertiary)", borderBottom: "1px solid var(--border-color)" }}>
                    <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                      {template.components.map((comp, idx) => (
                        <div key={idx} style={{ fontSize: "13px", lineHeight: "1.5" }}>
                          <span style={{ fontWeight: "700", color: "var(--text-secondary)", textTransform: "capitalize", marginRight: "6px" }}>
                            {comp.type}:
                          </span>
                          {comp.type === "BUTTONS" ? (
                            <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginTop: "6px" }}>
                              {comp.buttons?.map((btn, bIdx) => (
                                <div
                                  key={bIdx}
                                  style={{
                                    padding: "4px 10px",
                                    background: "white",
                                    border: "1px solid var(--border-color)",
                                    borderRadius: "14px",
                                    fontSize: "11px",
                                    color: "var(--accent)",
                                    fontWeight: "600",
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "4px",
                                  }}
                                >
                                  {btn.type === "URL" && "🔗 "}
                                  {btn.type === "PHONE_NUMBER" && "📞 "}
                                  {btn.text}
                                </div>
                              ))}
                            </div>
                          ) : comp.format === "IMAGE" || comp.format === "VIDEO" || comp.format === "DOCUMENT" ? (
                            <span style={{ color: "var(--accent)", fontWeight: "600", background: "rgba(16, 185, 129, 0.12)", padding: "2px 8px", borderRadius: "6px" }}>
                              [{comp.format} MEDIA]
                            </span>
                          ) : (
                            <span style={{ color: "var(--text-primary)", whiteSpace: "pre-wrap" }}>{comp.text}</span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Card Actions & Footer */}
                  <div
                    style={{
                      padding: "12px 20px",
                      fontSize: "12px",
                      color: "var(--text-muted)",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      background: "var(--bg-secondary)",
                    }}
                  >
                    <span>
                      {template.last_updated_time
                        ? `Updated: ${new Date(template.last_updated_time).toLocaleDateString(undefined, { month: "short", day: "numeric" })}`
                        : "Meta Cloud Template"}
                    </span>

                    {/* Delete Template Button */}
                    <button
                      type="button"
                      onClick={() => setTemplateToDelete(template)}
                      title={`Delete template "${template.name}" from Meta Cloud`}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "6px",
                        padding: "6px 12px",
                        fontSize: "12px",
                        fontWeight: "600",
                        color: "#dc2626",
                        background: "rgba(220, 38, 38, 0.08)",
                        border: "1px solid rgba(220, 38, 38, 0.25)",
                        borderRadius: "6px",
                        cursor: "pointer",
                        transition: "all 0.15s ease",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = "#dc2626";
                        e.currentTarget.style.color = "#ffffff";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = "rgba(220, 38, 38, 0.08)";
                        e.currentTarget.style.color = "#dc2626";
                      }}
                    >
                      <Trash2 size={13} />
                      Delete
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {templateToDelete && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0, 0, 0, 0.6)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
            padding: "20px",
          }}
          onClick={() => !isDeleting && setTemplateToDelete(null)}
        >
          <div
            style={{
              background: "white",
              borderRadius: "16px",
              maxWidth: "480px",
              width: "100%",
              padding: "28px",
              boxShadow: "0 20px 40px rgba(0,0,0,0.2)",
              border: "1px solid var(--border-color)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <div
                  style={{
                    width: "42px",
                    height: "42px",
                    borderRadius: "50%",
                    background: "rgba(220, 38, 38, 0.12)",
                    color: "#dc2626",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <AlertTriangle size={22} />
                </div>
                <h3 style={{ fontSize: "18px", fontWeight: "700", color: "var(--text-primary)", margin: 0 }}>
                  Delete WhatsApp Template?
                </h3>
              </div>
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setTemplateToDelete(null)}
                style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer" }}
              >
                <X size={20} />
              </button>
            </div>

            <p style={{ fontSize: "14px", color: "var(--text-secondary)", lineHeight: "1.6", marginBottom: "16px" }}>
              Are you sure you want to permanently delete template <strong style={{ color: "var(--text-primary)" }}>&ldquo;{templateToDelete.name}&rdquo;</strong> from Meta WhatsApp Cloud?
            </p>

            <div style={{ padding: "12px 14px", background: "var(--bg-tertiary)", borderRadius: "8px", fontSize: "13px", color: "var(--text-muted)", marginBottom: "20px" }}>
              <div>📱 <strong>Created for:</strong> {templateToDelete.created_for?.name || "WhatsApp Sender"} ({templateToDelete.created_for?.phone_number || "Active"})</div>
              <div style={{ marginTop: "4px" }}>⚠️ This action will permanently remove this template from your WhatsApp Business Account. Active campaigns using this template will no longer be deliverable.</div>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px" }}>
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setTemplateToDelete(null)}
                className="btn-secondary"
                style={{ padding: "10px 18px", fontSize: "14px" }}
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={handleDeleteConfirm}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "8px",
                  padding: "10px 20px",
                  fontSize: "14px",
                  fontWeight: "600",
                  color: "#ffffff",
                  background: "#dc2626",
                  border: "none",
                  borderRadius: "8px",
                  cursor: isDeleting ? "not-allowed" : "pointer",
                  opacity: isDeleting ? 0.7 : 1,
                }}
              >
                {isDeleting ? (
                  <>Deleting from Meta...</>
                ) : (
                  <>
                    <Trash2 size={16} />
                    Yes, Delete Permanently
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
