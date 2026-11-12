"use client";

import { useState, useEffect, useCallback } from "react";
import { getContacts, getMessages, markMessagesAsRead } from "../lib/api";
import { getSocket } from "../lib/socket";
import ChatSidebar from "./components/ChatSidebar";
import ChatWindow from "./components/ChatWindow";
import { MessageCircle, ShieldCheck, Zap, Lock, UserPlus, Phone, X, Search } from "lucide-react";
import BrandLogo from "../components/BrandLogo";
import { useToast } from "../components/ToastProvider";

const isSameMessage = (existing, incoming) =>
  (existing.id != null &&
    incoming.id != null &&
    String(existing.id) === String(incoming.id)) ||
  (existing.meta_message_id &&
    incoming.meta_message_id &&
    existing.meta_message_id === incoming.meta_message_id);

export default function ChatPage() {
  const [contacts, setContacts] = useState([]);
  const [selectedContact, setSelectedContact] = useState(null);
  const [messages, setMessages] = useState([]);
  const [windowInfo, setWindowInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState("all");
  const [currentUser, setCurrentUser] = useState(null);
  const [activeClientId, setActiveClientId] = useState(null);
  const [adminScope, setAdminScope] = useState("all");
  const [adminClientFilter, setAdminClientFilter] = useState("all");
  const [clientsList, setClientsList] = useState([]);

  // New 1-to-1 Chat State
  const [showNewChatModal, setShowNewChatModal] = useState(false);
  const [newChatPhone, setNewChatPhone] = useState("");
  const [newChatName, setNewChatName] = useState("");
  const [newChatLoading, setNewChatLoading] = useState(false);

  const { showSuccess, showError } = useToast();

  useEffect(() => {
    if (typeof window !== "undefined") {
      const u = localStorage.getItem("user");
      if (u) setCurrentUser(JSON.parse(u));
      setActiveClientId(localStorage.getItem("active_client_id"));
    }
  }, []);

  const isMasterAdmin = currentUser?.role === "master_admin" && !activeClientId;

  useEffect(() => {
    if (isMasterAdmin) {
      import("../lib/api").then(({ getClientsDropdown }) => {
        getClientsDropdown()
          .then((res) => {
            const rawList = res.data?.clients || (Array.isArray(res.data) ? res.data : []);
            // Filter strictly for client accounts, exclude Master Admin (Piyush Assudani)
            const filtered = rawList.filter(
              (c) => c.role !== "master_admin" && c.username?.toLowerCase() !== "piyushassudani"
            );
            setClientsList(filtered);
          })
          .catch((err) => console.error("Failed to load clients dropdown:", err));
      });
    }
  }, [isMasterAdmin]);

  // Fetch contacts with multi-tenant filtering
  const fetchContacts = useCallback(async () => {
    try {
      const params = {};
      if (adminScope !== "all") {
        params.scope = adminScope;
      }
      if (adminClientFilter && adminClientFilter !== "all") {
        params.client_id = adminClientFilter;
      }
      const res = await getContacts(params);
      setContacts(res.data);
    } catch (err) {
      console.error("Failed to fetch contacts:", err);
    } finally {
      setLoading(false);
    }
  }, [adminScope, adminClientFilter]);

  // Assign an unassigned contact to a client
  const handleAssignContact = async (contactId, userId) => {
    try {
      const { assignContact } = await import("../lib/api");
      const res = await assignContact(contactId, userId);
      const updatedContact = res.data.contact;

      setContacts((prev) =>
        prev.map((c) =>
          c.id === contactId
            ? { ...c, user_id: updatedContact.user_id, client_owner_name: updatedContact.client_owner_name }
            : c
        )
      );

      if (selectedContact?.id === contactId) {
        setSelectedContact((prev) => ({
          ...prev,
          user_id: updatedContact.user_id,
          client_owner_name: updatedContact.client_owner_name,
        }));
      }

      showSuccess(res.data.message || "Contact assignment updated.");
    } catch (err) {
      console.error("Failed to assign contact:", err);
      showError(err.response?.data?.error || "Failed to assign contact.");
    }
  };

  // Fetch messages for a contact
  const fetchMessages = useCallback(async (contactId) => {
    setMessagesLoading(true);
    try {
      const res = await getMessages(contactId);
      setMessages(res.data.messages);
      setWindowInfo(res.data.window);
    } catch (err) {
      console.error("Failed to fetch messages:", err);
    } finally {
      setMessagesLoading(false);
    }
  }, []);

  const markContactRead = useCallback(async (contactId) => {
    try {
      await markMessagesAsRead(contactId);
      setContacts((prev) =>
        prev.map((contact) =>
          String(contact.id) === String(contactId)
            ? { ...contact, unread_count: 0 }
            : contact
        )
      );
    } catch (err) {
      console.error("Failed to mark messages as read:", err);
      await fetchContacts();
    }
  }, [fetchContacts]);

  // Select a contact
  const handleSelectContact = useCallback(
    async (contact) => {
      setSelectedContact(contact);
      fetchMessages(contact.id);
      await markContactRead(contact.id);
    },
    [fetchMessages, markContactRead]
  );

  // Delete a contact
  const handleDeleteContact = useCallback(async (contactId) => {
    if (!window.confirm("Are you sure you want to delete this contact and all their messages?")) return;
    
    try {
      const { deleteContact } = await import("../lib/api");
      await deleteContact(contactId);
      setContacts((prev) => prev.filter((c) => c.id !== contactId));
      if (selectedContact?.id === contactId) {
        setSelectedContact(null);
        setMessages([]);
      }
      showSuccess("Contact deleted successfully.");
    } catch (err) {
      console.error("Failed to delete contact:", err);
      showError(err.response?.data?.error || "Failed to delete contact. Please try again.");
    }
  }, [selectedContact, showSuccess, showError]);

  const handleStartNewChat = async (e) => {
    if (e) e.preventDefault();
    if (!newChatPhone.trim()) return;

    setNewChatLoading(true);
    try {
      const { default: api } = await import("../lib/api");
      const res = await api.post("/api/contacts", {
        phone_number: newChatPhone.trim(),
        name: newChatName.trim() || undefined,
      });

      const contactData = res.data?.contact;
      if (contactData) {
        setContacts((prev) => {
          const exists = prev.some((c) => String(c.id) === String(contactData.id));
          return exists ? prev : [contactData, ...prev];
        });
        handleSelectContact(contactData);
        setShowNewChatModal(false);
        setNewChatPhone("");
        setNewChatName("");
        showSuccess(res.data.message || "Conversation ready!");
      }
    } catch (err) {
      console.error("Failed to start new chat:", err);
      showError(err.response?.data?.error || "Failed to start conversation. Please check the number.");
    } finally {
      setNewChatLoading(false);
    }
  };

  // Initial load
  useEffect(() => {
    fetchContacts();
  }, [fetchContacts]);

  // Auto-select contact from URL parameter (e.g. /chat?contact=123)
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const targetContactId = params.get("contact") || params.get("contactId");
    if (targetContactId) {
      const found = contacts.find(
        (c) => String(c.id) === String(targetContactId) || c.phone_number === targetContactId
      );
      if (found) {
        if (String(selectedContact?.id) !== String(found.id)) {
          handleSelectContact(found);
        }
      } else if (!loading) {
        // Fetch contact directly if not in initial list
        import("../lib/api").then(({ getContact }) => {
          getContact(targetContactId)
            .then((res) => {
              if (res.data) {
                setContacts((prev) => [res.data, ...prev.filter(c => c.id !== res.data.id)]);
                handleSelectContact(res.data);
              }
            })
            .catch(() => {});
        });
      }
    }
  }, [contacts, loading, selectedContact, handleSelectContact]);

  // Socket.io real-time updates
  useEffect(() => {
    const socket = getSocket();

    const handleNewMessage = (msg) => {
      // Multi-tenant check: if client view or client login, ignore messages of other clients or unassigned
      if (!isMasterAdmin) {
        const effectiveId = activeClientId || currentUser?.id;
        if (msg.contact_user_id && effectiveId && String(msg.contact_user_id) !== String(effectiveId)) {
          return; // Ignore other client's inbound messages
        }
        if (!msg.contact_user_id) {
          return; // Direct inbound stranger message, client should not see
        }
      }

      // Update messages if viewing this contact's chat
      const isSelectedContact =
        selectedContact &&
        String(msg.contact_id) === String(selectedContact.id);
      if (isSelectedContact) {
        setMessages((prev) => {
          if (prev.some((existing) => isSameMessage(existing, msg))) return prev;
          return [...prev, msg];
        });

        // If inbound, update window info
        if (msg.direction === "inbound") {
          setWindowInfo((prev) => ({
            ...prev,
            open: true,
            last_inbound_at: msg.timestamp,
            expires_at: new Date(
              new Date(msg.timestamp).getTime() + 24 * 60 * 60 * 1000
            ).toISOString(),
          }));
          
          markContactRead(msg.contact_id);
        }
      }

      
      setContacts((prev) => {
        const idx = prev.findIndex((c) => c.id === msg.contact_id);
        if (idx === -1) {
          
          return [
            {
              id: msg.contact_id,
              phone_number: msg.contact_phone,
              name: msg.contact_name || msg.contact_phone || "Customer",
              last_message: msg.message_body,
              last_message_direction: msg.direction,
              last_message_time: msg.timestamp,
              unread_count: msg.direction === "inbound" ? 1 : 0,
            },
            ...prev,
          ];
        }

        const updated = [...prev];
        const contact = {
          ...updated[idx],
          last_message: msg.message_body,
          last_message_direction: msg.direction,
          last_message_time: msg.timestamp,
        };

        
        if (
          msg.direction === "inbound" &&
          !isSelectedContact
        ) {
          contact.unread_count = (contact.unread_count || 0) + 1;
        }

        if (msg.direction === "inbound") {
          contact.last_inbound_time = msg.timestamp;
        }

        
        updated.splice(idx, 1);
        return [contact, ...updated];
      });

      // Silently re-sync contacts directory from server
      fetchContacts();
    };

    const handleStatusUpdate = (data) => {
      setMessages((prev) =>
        prev.map((m) =>
          m.meta_message_id === data.meta_message_id
            ? { ...m, status: data.status }
            : m
        )
      );
    };

    const handleMessageDeleted = (data) => {
      setMessages((prev) =>
        prev.filter((message) => String(message.id) !== String(data.id))
      );
    };

    socket.on("new_message", handleNewMessage);
    socket.on("message_status", handleStatusUpdate);
    socket.on("message_deleted", handleMessageDeleted);

    return () => {
      socket.off("new_message", handleNewMessage);
      socket.off("message_status", handleStatusUpdate);
      socket.off("message_deleted", handleMessageDeleted);
    };
  }, [markContactRead, selectedContact]);

  
  const handleMessageSent = useCallback((newMsg) => {
    setMessages((prev) =>
      prev.some((existing) => isSameMessage(existing, newMsg))
        ? prev
        : [...prev, newMsg]
    );
  }, []);

  const handleMessageDeleted = useCallback((messageId) => {
    setMessages((prev) =>
      prev.filter((message) => String(message.id) !== String(messageId))
    );
    fetchContacts();
  }, [fetchContacts]);

  
  const filteredContacts = contacts.filter((c) => {
    // Search filter
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchesSearch = 
        c.phone_number?.toLowerCase().includes(q) ||
        c.name?.toLowerCase().includes(q) ||
        c.last_message?.toLowerCase().includes(q);
      if (!matchesSearch) return false;
    }

    // Category filter
    switch (activeFilter) {
      case "unread":
        return (c.unread_count || 0) > 0;
      case "read":
        return (c.unread_count || 0) === 0;
      case "window_open":
        if (!c.last_inbound_time) return false;
        return new Date() - new Date(c.last_inbound_time) < 24 * 60 * 60 * 1000;
      default:
        return true;
    }
  });

  return (
    <div className="chat-container" style={{ display: "flex", height: "100%", width: "100%", overflow: "hidden", position: "relative" }}>
      <div className={`chat-pane-sidebar ${selectedContact ? "mobile-hidden" : ""}`} style={{ height: "100%", display: "flex" }}>
        <ChatSidebar
          contacts={filteredContacts}
          selectedContact={selectedContact}
          onSelectContact={handleSelectContact}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          activeFilter={activeFilter}
          onFilterChange={setActiveFilter}
          loading={loading}
          isMasterAdmin={isMasterAdmin}
          adminScope={adminScope}
          onScopeChange={setAdminScope}
          clientsList={clientsList}
          adminClientFilter={adminClientFilter}
          onClientFilterChange={setAdminClientFilter}
          onOpenNewChat={() => setShowNewChatModal(true)}
        />
      </div>

      <div className={`chat-pane-window ${!selectedContact ? "mobile-hidden" : ""}`} style={{ flex: 1, height: "100%", minWidth: 0 }}>
        {selectedContact ? (
          <ChatWindow
            key={selectedContact.id}
            contact={selectedContact}
            messages={messages}
            windowInfo={windowInfo}
            loading={messagesLoading}
            onMessageSent={handleMessageSent}
            onMessageDeleted={handleMessageDeleted}
            onDeleteContact={handleDeleteContact}
            onBack={() => setSelectedContact(null)}
            isMasterAdmin={isMasterAdmin}
            clientsList={clientsList}
            onAssignContact={handleAssignContact}
          />
        ) : (
          <div className="chat-window" style={{ flex: 1, width: "100%", height: "100%" }}>
            <div className="chat-window-empty">
              <div style={{ marginBottom: "20px" }}>
                <BrandLogo size={68} iconOnly />
              </div>
              <h2 style={{ fontSize: "24px", fontWeight: "800", color: "var(--text-primary)", marginBottom: "8px", letterSpacing: "-0.02em" }}>
                Enterprise WhatsApp Workspace
              </h2>
              <p style={{ maxWidth: "460px", color: "var(--text-secondary)", fontSize: "14px", lineHeight: "1.6", margin: "0 auto 24px" }}>
                Select a contact from the directory to review 2-way conversation logs and dispatch live messages. All inbound inquiries trigger real-time socket updates.
              </p>
              <div
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "8px",
                  padding: "8px 16px",
                  borderRadius: "999px",
                  background: "var(--accent-muted)",
                  color: "var(--accent)",
                  fontSize: "12px",
                  fontWeight: "600",
                }}
              >
                <Lock size={14} /> End-to-End Meta Cloud Webhook Synchronized
              </div>
              <div style={{ marginTop: "24px" }}>
                <button
                  type="button"
                  className="btn-primary"
                  onClick={() => setShowNewChatModal(true)}
                  style={{ display: "inline-flex", alignItems: "center", gap: "8px", padding: "10px 20px" }}
                >
                  <UserPlus size={18} />
                  <span>Start 1-to-1 Conversation</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Start 1-to-1 Chat Modal */}
      {showNewChatModal && (
        <div className="modal-overlay" onClick={() => !newChatLoading && setShowNewChatModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: "480px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <div style={{ width: "36px", height: "36px", borderRadius: "10px", background: "rgba(37, 99, 235, 0.1)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--accent)" }}>
                  <UserPlus size={20} />
                </div>
                <h2 className="modal-title" style={{ margin: 0, fontSize: "18px" }}>Start 1-to-1 Conversation</h2>
              </div>
              <button
                type="button"
                onClick={() => setShowNewChatModal(false)}
                style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)" }}
                disabled={newChatLoading}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleStartNewChat}>
              <div className="form-group" style={{ marginBottom: "16px" }}>
                <label className="form-label">WhatsApp Mobile Number *</label>
                <input
                  type="tel"
                  className="form-input"
                  placeholder="e.g., 919876543210 or 9876543210"
                  value={newChatPhone}
                  onChange={(e) => setNewChatPhone(e.target.value)}
                  disabled={newChatLoading}
                  required
                  autoFocus
                />
                <span style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "4px", display: "block" }}>
                  Enter 10-digit number or with country code 91.
                </span>
              </div>

              <div className="form-group" style={{ marginBottom: "20px" }}>
                <label className="form-label">Contact Name (Optional)</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g., Customer Name"
                  value={newChatName}
                  onChange={(e) => setNewChatName(e.target.value)}
                  disabled={newChatLoading}
                />
              </div>

              {/* Quick Matching from Saved Contacts */}
              {newChatPhone.trim().length >= 2 && (
                <div style={{ marginBottom: "20px", maxHeight: "160px", overflowY: "auto", border: "1px solid var(--border-color)", borderRadius: "8px", padding: "6px" }}>
                  <div style={{ fontSize: "11px", fontWeight: "600", color: "var(--text-muted)", padding: "4px 8px" }}>
                    Matching Contacts from Directory:
                  </div>
                  {contacts
                    .filter((c) =>
                      c.phone_number?.includes(newChatPhone.trim()) ||
                      c.name?.toLowerCase().includes(newChatPhone.trim().toLowerCase())
                    )
                    .slice(0, 5)
                    .map((c) => (
                      <div
                        key={c.id}
                        onClick={() => {
                          handleSelectContact(c);
                          setShowNewChatModal(false);
                          setNewChatPhone("");
                          setNewChatName("");
                        }}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          padding: "8px 10px",
                          borderRadius: "6px",
                          cursor: "pointer",
                          background: "var(--bg-secondary)",
                          marginBottom: "4px",
                          fontSize: "13px",
                        }}
                      >
                        <div>
                          <div style={{ fontWeight: 600, color: "var(--text-primary)" }}>{c.name || "Customer"}</div>
                          <div style={{ fontSize: "11px", color: "var(--text-secondary)" }}>+{c.phone_number}</div>
                        </div>
                        <span style={{ fontSize: "11px", color: "var(--accent)", fontWeight: 600 }}>Open Chat →</span>
                      </div>
                    ))}
                </div>
              )}

              <div className="modal-actions">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setShowNewChatModal(false)}
                  disabled={newChatLoading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={newChatLoading || !newChatPhone.trim()}
                >
                  {newChatLoading ? "Opening..." : "Open Conversation"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
