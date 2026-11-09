"use client";

import { Search } from "lucide-react";
import ContactItem from "./ContactItem";

const FILTERS = [
  { key: "all", label: "All" },
  { key: "unread", label: "Unread" },
  { key: "read", label: "Read" },
  { key: "window_open", label: "Window Open" },
];

export default function ChatSidebar({
  contacts,
  selectedContact,
  onSelectContact,
  searchQuery,
  onSearchChange,
  activeFilter,
  onFilterChange,
  loading,
  isMasterAdmin = false,
  adminScope = "all",
  onScopeChange,
}) {
  return (
    <aside className="chat-sidebar">
      <div className="chat-sidebar-header">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
          <h1 className="chat-sidebar-title" style={{ margin: 0 }}>Chats</h1>
          {isMasterAdmin && (
            <span
              style={{
                fontSize: "11px",
                fontWeight: "600",
                padding: "2px 8px",
                borderRadius: "12px",
                background: "rgba(99, 102, 241, 0.12)",
                color: "#6366f1",
              }}
            >
              Master View
            </span>
          )}
        </div>

        {/* Master Admin Scope Tabs: All Chats, Client Chats, Direct Inbound */}
        {isMasterAdmin && (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr 1fr",
              gap: "4px",
              background: "var(--bg-secondary, #f1f5f9)",
              padding: "3px",
              borderRadius: "8px",
              marginBottom: "10px",
              fontSize: "11px",
              fontWeight: "600",
            }}
          >
            <button
              type="button"
              onClick={() => onScopeChange?.("all")}
              style={{
                padding: "5px 2px",
                borderRadius: "6px",
                border: "none",
                cursor: "pointer",
                background: adminScope === "all" ? "#fff" : "transparent",
                color: adminScope === "all" ? "var(--accent, #2563eb)" : "var(--text-secondary)",
                boxShadow: adminScope === "all" ? "0 1px 3px rgba(0,0,0,0.08)" : "none",
                transition: "all 0.15s ease",
              }}
            >
              All Chats
            </button>
            <button
              type="button"
              onClick={() => onScopeChange?.("assigned")}
              style={{
                padding: "5px 2px",
                borderRadius: "6px",
                border: "none",
                cursor: "pointer",
                background: adminScope === "assigned" ? "#fff" : "transparent",
                color: adminScope === "assigned" ? "var(--accent, #2563eb)" : "var(--text-secondary)",
                boxShadow: adminScope === "assigned" ? "0 1px 3px rgba(0,0,0,0.08)" : "none",
                transition: "all 0.15s ease",
              }}
            >
              Client Chats
            </button>
            <button
              type="button"
              onClick={() => onScopeChange?.("unassigned")}
              style={{
                padding: "5px 2px",
                borderRadius: "6px",
                border: "none",
                cursor: "pointer",
                background: adminScope === "unassigned" ? "#fff" : "transparent",
                color: adminScope === "unassigned" ? "#d97706" : "var(--text-secondary)",
                boxShadow: adminScope === "unassigned" ? "0 1px 3px rgba(0,0,0,0.08)" : "none",
                transition: "all 0.15s ease",
              }}
            >
              Direct Inbound
            </button>
          </div>
        )}

        <div className="search-box">
          <Search size={16} className="search-icon" />
          <input
            type="text"
            placeholder="Search contacts..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
          />
        </div>
        <div className="chat-filters">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              className={`chat-filter-btn ${activeFilter === f.key ? "active" : ""}`}
              onClick={() => onFilterChange(f.key)}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <div className="contact-list">
        {loading ? (
          <div className="loading-container">
            <div className="loading-spinner" />
          </div>
        ) : contacts.length === 0 ? (
          <div
            style={{
              padding: "40px 20px",
              textAlign: "center",
              color: "var(--text-secondary)",
            }}
          >
            <p style={{ fontSize: "14px" }}>
              {searchQuery
                ? "No contacts match your search"
                : activeFilter !== "all"
                ? `No ${activeFilter} contacts`
                : adminScope === "unassigned"
                ? "No direct inbound / unassigned messages."
                : "No contacts yet. Incoming messages will appear here."}
            </p>
          </div>
        ) : (
          contacts.map((contact) => (
            <ContactItem
              key={contact.id}
              contact={contact}
              isActive={selectedContact?.id === contact.id}
              onClick={() => onSelectContact(contact)}
              showOwnerBadge={isMasterAdmin}
            />
          ))
        )}
      </div>
    </aside>
  );
}
