"use client";

import { useRef, useEffect, useState, useCallback } from "react";
import { format, isToday, isYesterday, isSameDay } from "date-fns";
import { ArrowDown, ArrowLeft, Phone, Trash2 } from "lucide-react";
import MessageBubble from "./MessageBubble";
import ChatInput from "./ChatInput";
import { deleteMessage } from "../../lib/api";

export default function ChatWindow({
  contact,
  messages,
  windowInfo,
  loading,
  onMessageSent,
  onMessageDeleted,
  onDeleteContact,
  onBack,
  isMasterAdmin = false,
  clientsList = [],
  onAssignContact,
}) {
  const chatMessagesRef = useRef(null);
  const messagesEndRef = useRef(null);
  const isAtBottomRef = useRef(true);
  const [isAtBottom, setIsAtBottom] = useState(true);
  const [lastSeenMessageCount, setLastSeenMessageCount] = useState(0);
  const [selectedImage, setSelectedImage] = useState(null);
  const [pendingDeleteMessage, setPendingDeleteMessage] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const [templates, setTemplates] = useState([]);
  const [assigning, setAssigning] = useState(false);

  useEffect(() => {
    import("../../lib/api").then(({ getTemplates }) => {
      getTemplates().then(res => setTemplates(res.data)).catch(console.error);
    });
  }, []);
  const hasNewMessages =
    messages.length > lastSeenMessageCount && !isAtBottom;

  const scrollToLatest = useCallback((behavior = "smooth") => {
    messagesEndRef.current?.scrollIntoView({ behavior });
    isAtBottomRef.current = true;
  }, []);

  const handleScrollToLatest = () => {
    setIsAtBottom(true);
    setLastSeenMessageCount(messages.length);
    scrollToLatest();
  };

  useEffect(() => {
    if (isAtBottomRef.current) {
      scrollToLatest();
    }
  }, [messages, scrollToLatest]);

  useEffect(() => {
    if (!loading) {
      scrollToLatest("auto");
    }
  }, [contact.id, loading, scrollToLatest]);

  const handleMessagesScroll = () => {
    const container = chatMessagesRef.current;
    if (!container) return;

    const atBottom =
      container.scrollHeight - container.scrollTop - container.clientHeight < 80;
    isAtBottomRef.current = atBottom;
    setIsAtBottom(atBottom);
    if (atBottom) setLastSeenMessageCount(messages.length);
  };

  const formatDateLabel = (date) => {
    if (!date) return "Older messages (date unavailable)";
    const d = new Date(date);
    if (isNaN(d.getTime()) || d.getTime() <= 0) {
      return "Older messages (date unavailable)";
    }
    if (isToday(d)) return "Today";
    if (isYesterday(d)) return "Yesterday";
    return format(d, "MMMM d, yyyy");
  };

  const handleDeleteMessage = async () => {
    if (!pendingDeleteMessage || deleteLoading) return;
    setDeleteLoading(true);
    setDeleteError("");
    try {
      const result = await deleteMessage(pendingDeleteMessage.id);
      onMessageDeleted?.(result.data.id || pendingDeleteMessage.id);
      setPendingDeleteMessage(null);
    } catch (err) {
      console.error("Delete message failed", err);
      setDeleteError(err.response?.data?.error || "Message delete nahi hua. Dobara try karein.");
    } finally {
      setDeleteLoading(false);
    }
  };

  
  const renderMessages = () => {
    if (!messages || messages.length === 0) {
      return (
        <div
          style={{
            flex: 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "var(--text-secondary)",
            fontSize: "14px",
          }}
        >
          No messages yet
        </div>
      );
    }

    const elements = [];
    let lastDate = null;

    const chronologicalMessages = [...messages].sort((a, b) => {
      const timeA = new Date(a.timestamp).getTime();
      const timeB = new Date(b.timestamp).getTime();
      const validA = Number.isFinite(timeA) && timeA > 0;
      const validB = Number.isFinite(timeB) && timeB > 0;

      if (!validA && validB) return -1;
      if (validA && !validB) return 1;
      if (!validA && !validB) return 0;
      return timeA - timeB;
    });

    chronologicalMessages.forEach((msg, idx) => {
      const msgDate = new Date(msg.timestamp);

      if (!lastDate || !isSameDay(lastDate, msgDate)) {
        elements.push(
          <div className="date-separator" key={`date-${idx}`}>
            <span className="date-separator-label">
              {formatDateLabel(msgDate)}
            </span>
          </div>
        );
        lastDate = msgDate;
      }

      elements.push(
        <MessageBubble 
          key={msg.id || idx} 
          message={msg}
          templates={templates} 
          onImageClick={setSelectedImage}
          onDelete={() => {
            setDeleteError("");
            setPendingDeleteMessage(msg);
          }}
        />
      );
    });

    return elements;
  };

  return (
    <div className="chat-window">
      {}
      <div className="chat-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px", minWidth: 0 }}>
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              className="chat-back-btn"
              title="Back to contacts"
              style={{
                background: "none",
                border: "none",
                color: "var(--text-secondary)",
                cursor: "pointer",
                padding: "6px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                borderRadius: "8px",
                flexShrink: 0,
              }}
            >
              <ArrowLeft size={20} />
            </button>
          )}
          <div className="contact-avatar" style={{ flexShrink: 0 }}>
            {contact.name
              ? contact.name
                  .split(" ")
                  .map((w) => w[0])
                  .join("")
                  .substring(0, 2)
              : contact.phone_number?.slice(-2)}
          </div>
          <div className="chat-header-info">
            <div className="chat-header-name">
              {contact.name || contact.phone_number}
            </div>
            <div className="chat-header-phone">
              {contact.name ? contact.phone_number : ""}
              {windowInfo?.open && (
                <span
                  style={{
                    marginLeft: "8px",
                    color: "var(--accent)",
                    fontSize: "12px",
                  }}
                >
                  ● Window open
                </span>
              )}
              {windowInfo && !windowInfo.open && (
                <span
                  style={{
                    marginLeft: "8px",
                    color: "var(--warning-text)",
                    fontSize: "12px",
                  }}
                >
                  ● Window closed
                </span>
              )}
            </div>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <a
            href={`tel:${contact.phone_number.startsWith('+') ? contact.phone_number : '+' + contact.phone_number}`}
            style={{ color: "var(--text-secondary)", cursor: "pointer" }}
            title={`Call ${contact.name || contact.phone_number}`}
          >
            <Phone size={20} />
          </a>
          <button
            onClick={() => onDeleteContact?.(contact.id)}
            style={{ background: "none", border: "none", color: "var(--warning-text)", cursor: "pointer" }}
            title="Delete Contact"
          >
            <Trash2 size={20} />
          </button>
        </div>
      </div>

      {/* Master Admin Multi-Tenant Client Assign Bar */}
      {isMasterAdmin && (
        <div
          style={{
            padding: "8px 16px",
            background: contact.user_id ? "rgba(59, 130, 246, 0.05)" : "rgba(245, 158, 11, 0.08)",
            borderBottom: "1px solid var(--border-color, #e2e8f0)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            fontSize: "12px",
            flexWrap: "wrap",
            gap: "8px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ fontWeight: "600", color: contact.user_id ? "#2563eb" : "#d97706" }}>
              {contact.user_id ? "👤 Client Workspace:" : "📥 Direct Inbound (Unassigned):"}
            </span>
            <span style={{ color: "var(--text-secondary)" }}>
              {contact.client_owner_name ? contact.client_owner_name : "Direct message from unprompted customer"}
            </span>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <label style={{ fontSize: "11px", color: "var(--text-muted)", fontWeight: "500" }}>Assign to Client:</label>
            <select
              value={contact.user_id || ""}
              onChange={async (e) => {
                const targetId = e.target.value || null;
                setAssigning(true);
                try {
                  await onAssignContact?.(contact.id, targetId);
                } finally {
                  setAssigning(false);
                }
              }}
              disabled={assigning}
              style={{
                padding: "4px 8px",
                fontSize: "11px",
                borderRadius: "6px",
                border: "1px solid var(--border-color, #cbd5e1)",
                background: "#fff",
                cursor: "pointer",
                fontWeight: "500",
              }}
            >
              <option value="">-- Direct Inbound (Unassigned) --</option>
              {clientsList.map((cl) => (
                <option key={cl.id} value={cl.id}>
                  {cl.username} {cl.business_name ? `(${cl.business_name})` : ""}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      {/* Chat Messages */}
      <div
        className="chat-messages"
        ref={chatMessagesRef}
        onScroll={handleMessagesScroll}
      >
        {loading ? (
          <div className="loading-container">
            <div className="loading-spinner" />
          </div>
        ) : (
          <>
            {renderMessages()}
            <div ref={messagesEndRef} />
          </>
        )}
        {hasNewMessages && !loading && (
          <button
            className="chat-latest-button"
            onClick={handleScrollToLatest}
            aria-label="Scroll to latest message"
          >
            <ArrowDown size={16} />
            Latest messages
          </button>
        )}
      </div>

      {}
      <ChatInput
        contactId={contact.id}
        windowInfo={windowInfo}
        onMessageSent={onMessageSent}
      />
      {/* Media Modal */}
      {selectedImage && (
        <div 
          onClick={() => setSelectedImage(null)}
          style={{
            position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: "rgba(0,0,0,0.8)", zIndex: 1000,
            display: "flex", alignItems: "center", justifyContent: "center",
            padding: "40px"
          }}
        >
          <div style={{ position: "relative", maxWidth: "90%", maxHeight: "90%" }} onClick={(e) => e.stopPropagation()}>
            <button 
              onClick={() => setSelectedImage(null)}
              style={{ position: "absolute", top: "-40px", right: "0", background: "none", border: "none", color: "white", fontSize: "24px", cursor: "pointer", zIndex: 1001 }}
            >
              ✕
            </button>
            
            {typeof selectedImage === 'string' || selectedImage?.type === 'image' ? (
              <img src={typeof selectedImage === 'string' ? selectedImage : selectedImage.url} alt="Full screen" style={{ maxWidth: "100%", maxHeight: "80vh", objectFit: "contain", borderRadius: "8px" }} />
            ) : selectedImage?.type === 'video' ? (
              <video src={selectedImage.url} controls autoPlay style={{ maxWidth: "100%", maxHeight: "80vh", borderRadius: "8px" }} />
            ) : null}
          </div>
        </div>
      )}
      {pendingDeleteMessage && (
        <div
          className="modal-overlay"
          onClick={() => !deleteLoading && setPendingDeleteMessage(null)}
        >
          <div className="modal" role="dialog" aria-modal="true" aria-labelledby="delete-message-title" onClick={(e) => e.stopPropagation()}>
            <h3 className="modal-title" id="delete-message-title">Delete this message?</h3>
            <p style={{ color: "var(--text-secondary)", lineHeight: 1.5 }}>
              Are you sure you want to delete this message? This action cannot be undone.
            </p>
            {deleteError && (
              <p role="alert" style={{ color: "var(--warning-text)", marginTop: "12px" }}>
                {deleteError}
              </p>
            )}
            <div className="modal-actions">
              <button
                className="btn-secondary"
                onClick={() => setPendingDeleteMessage(null)}
                disabled={deleteLoading}
              >
                Cancel
              </button>
              <button
                className="btn-primary"
                onClick={handleDeleteMessage}
                disabled={deleteLoading}
                style={{ background: "var(--warning-text)" }}
              >
                {deleteLoading ? "Deleting..." : "Yes, delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
