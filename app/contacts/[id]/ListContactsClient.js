"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Users, Phone, MapPin, Plus, Trash2, X, Edit, AlertCircle, MessageSquare, UserX, Search } from "lucide-react";
import { getListContacts, deleteContact, addContactToList, updateContact, deleteNotOnWaContacts } from "../../lib/api";
import { useToast } from "../../components/ToastProvider";

export default function ListContactsPage() {
  const { showSuccess, showError } = useToast();
  const { id } = useParams();
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [showAddModal, setShowAddModal] = useState(false);
  const [newName, setNewName] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [newCity, setNewCity] = useState("");
  const [adding, setAdding] = useState(false);

  const [showEditModal, setShowEditModal] = useState(false);
  const [editContactId, setEditContactId] = useState(null);
  const [editName, setEditName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editCity, setEditCity] = useState("");
  const [editing, setEditing] = useState(false);

  const [deletingNotOnWa, setDeletingNotOnWa] = useState(false);
  const [filterType, setFilterType] = useState("all"); // "all" | "not_on_wa" | "valid"
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    fetchContacts();
  }, [id]);

  async function fetchContacts() {
    try {
      setLoading(true);
      const res = await getListContacts(id);
      setContacts(res.data);
    } catch (err) {
      console.error(err);
      setError("Failed to load contacts for this list.");
    } finally {
      setLoading(false);
    }
  };

  const handleAddContact = async (e) => {
    e.preventDefault();
    if (!newPhone) return;
    setAdding(true);
    try {
      await addContactToList(id, { name: newName, phone_number: newPhone, city: newCity });
      setShowAddModal(false);
      setNewName("");
      setNewPhone("");
      setNewCity("");
      showSuccess("Contact added to list successfully!");
      fetchContacts();
    } catch (err) {
      console.error(err);
      showError(err.response?.data?.error || "Failed to add contact");
    } finally {
      setAdding(false);
    }
  };

  const handleDeleteContact = async (contactId) => {
    if (!confirm("Are you sure you want to delete this contact?")) return;
    try {
      await deleteContact(contactId);
      setContacts(contacts.filter(c => c.id !== contactId));
      showSuccess("Contact deleted successfully.");
    } catch (err) {
      console.error(err);
      showError("Failed to delete contact");
    }
  };

  const handleEditClick = (contact) => {
    setEditContactId(contact.id);
    setEditName(contact.name || "");
    setEditPhone(contact.phone_number || "");
    setEditCity(contact.city || "");
    setShowEditModal(true);
  };

  const handleUpdateContact = async (e) => {
    e.preventDefault();
    if (!editPhone) return;
    setEditing(true);
    try {
      await updateContact(editContactId, { name: editName, phone_number: editPhone, city: editCity });
      setShowEditModal(false);
      showSuccess("Contact details updated successfully!");
      fetchContacts();
    } catch (err) {
      console.error(err);
      showError(err.response?.data?.error || "Failed to update contact");
    } finally {
      setEditing(false);
    }
  };

  const notOnWaContacts = contacts.filter((c) => c.not_on_wp);
  const notOnWaCount = notOnWaContacts.length;

  const handleDeleteNotOnWa = async () => {
    if (notOnWaCount === 0) return;
    if (
      !confirm(
        `Are you sure you want to delete all ${notOnWaCount} contacts marked as "Not on WhatsApp" from this list? This cannot be undone.`
      )
    ) {
      return;
    }

    setDeletingNotOnWa(true);
    try {
      const res = await deleteNotOnWaContacts(id);
      showSuccess(res.data?.message || `Successfully removed ${notOnWaCount} 'Not on WhatsApp' contacts!`);
      setContacts((prev) => prev.filter((c) => !c.not_on_wp));
      if (filterType === "not_on_wa") {
        setFilterType("all");
      }
    } catch (err) {
      console.error(err);
      showError(err.response?.data?.error || "Failed to delete 'Not on WA' contacts");
    } finally {
      setDeletingNotOnWa(false);
    }
  };

  const filteredContacts = contacts.filter((c) => {
    if (filterType === "not_on_wa" && !c.not_on_wp) return false;
    if (filterType === "valid" && c.not_on_wp) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const name = (c.name || "").toLowerCase();
      const phone = String(c.phone_number || "");
      const city = (c.city || "").toLowerCase();
      return name.includes(q) || phone.includes(q) || city.includes(q);
    }
    return true;
  });

  return (
    <div className="page-container">
      <div className="page-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "16px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <Link href="/contacts" className="btn-secondary" style={{ padding: "10px" }}>
            <ArrowLeft size={20} />
          </Link>
          <div>
            <h1 className="page-title">List Members</h1>
            <p style={{ color: "var(--text-muted)", fontSize: "14px", marginTop: "4px" }}>
              Total: <strong style={{ color: "var(--text-primary)" }}>{contacts.length}</strong> members
              {notOnWaCount > 0 && (
                <span style={{ marginLeft: "10px", color: "#ef4444", fontWeight: "600" }}>
                  • {notOnWaCount} Not on WA
                </span>
              )}
            </p>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
          {notOnWaCount > 0 && (
            <button
              onClick={handleDeleteNotOnWa}
              disabled={deletingNotOnWa}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                background: "rgba(239, 68, 68, 0.12)",
                color: "#ef4444",
                border: "1px solid rgba(239, 68, 68, 0.35)",
                padding: "8px 16px",
                borderRadius: "8px",
                fontSize: "14px",
                fontWeight: "600",
                cursor: deletingNotOnWa ? "not-allowed" : "pointer",
                transition: "all 0.15s ease",
              }}
              title="Delete all contacts not registered on WhatsApp from this list"
            >
              <Trash2 size={16} />
              {deletingNotOnWa ? "Deleting..." : `Delete Not on WA (${notOnWaCount})`}
            </button>
          )}
          <button className="btn-primary" onClick={() => setShowAddModal(true)}>
            <Plus size={18} />
            Add Contact
          </button>
        </div>
      </div>

      <div className="page-content">
        {error && (
          <div style={{ background: "rgba(255, 0, 0, 0.1)", color: "red", padding: "12px", borderRadius: "8px", marginBottom: "20px" }}>
            {error}
          </div>
        )}

        {/* Filter Toolbar */}
        {!loading && contacts.length > 0 && (
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "16px",
              flexWrap: "wrap",
              gap: "12px",
            }}
          >
            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
              <button
                type="button"
                onClick={() => setFilterType("all")}
                style={{
                  padding: "6px 14px",
                  borderRadius: "20px",
                  fontSize: "13px",
                  fontWeight: "600",
                  border: filterType === "all" ? "1px solid #2563eb" : "1px solid var(--border-color)",
                  background: filterType === "all" ? "#2563eb" : "var(--bg-secondary)",
                  color: filterType === "all" ? "#fff" : "var(--text-secondary)",
                  cursor: "pointer",
                }}
              >
                All ({contacts.length})
              </button>
              {notOnWaCount > 0 && (
                <button
                  type="button"
                  onClick={() => setFilterType("not_on_wa")}
                  style={{
                    padding: "6px 14px",
                    borderRadius: "20px",
                    fontSize: "13px",
                    fontWeight: "600",
                    border: "1px solid rgba(239, 68, 68, 0.35)",
                    background: filterType === "not_on_wa" ? "#ef4444" : "rgba(239, 68, 68, 0.08)",
                    color: filterType === "not_on_wa" ? "#fff" : "#ef4444",
                    cursor: "pointer",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "6px",
                  }}
                >
                  <AlertCircle size={14} />
                  Not on WA ({notOnWaCount})
                </button>
              )}
              <button
                type="button"
                onClick={() => setFilterType("valid")}
                style={{
                  padding: "6px 14px",
                  borderRadius: "20px",
                  fontSize: "13px",
                  fontWeight: "600",
                  border: filterType === "valid" ? "1px solid #10b981" : "1px solid var(--border-color)",
                  background: filterType === "valid" ? "#10b981" : "var(--bg-secondary)",
                  color: filterType === "valid" ? "#fff" : "var(--text-secondary)",
                  cursor: "pointer",
                }}
              >
                Valid Contacts ({contacts.length - notOnWaCount})
              </button>
            </div>

            <div style={{ position: "relative", minWidth: "220px" }}>
              <Search size={15} style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} />
              <input
                type="text"
                placeholder="Search name or number..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  padding: "7px 12px 7px 32px",
                  borderRadius: "8px",
                  border: "1px solid var(--border-color)",
                  background: "var(--bg-secondary)",
                  color: "var(--text-primary)",
                  fontSize: "13px",
                  width: "100%",
                  outline: "none",
                }}
              />
            </div>
          </div>
        )}

        {loading ? (
          <div className="loading-container">
            <div className="loading-spinner" />
          </div>
        ) : contacts.length === 0 ? (
          <div style={{ padding: "40px", textAlign: "center", color: "var(--text-muted)", background: "var(--bg-tertiary)", borderRadius: "12px" }}>
            No contacts found in this list.
          </div>
        ) : filteredContacts.length === 0 ? (
          <div style={{ padding: "40px", textAlign: "center", color: "var(--text-muted)", background: "var(--bg-tertiary)", borderRadius: "12px" }}>
            No contacts match the current filter or search query.
          </div>
        ) : (
          <div className="ui-card table-responsive" style={{ padding: "0", overflowX: "auto", width: "100%" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: "520px" }}>
              <thead style={{ background: "var(--bg-tertiary)", borderBottom: "1px solid var(--border-color)", textAlign: "left" }}>
                <tr>
                  <th style={{ padding: "16px 20px", fontSize: "12px", textTransform: "uppercase", color: "var(--text-muted)", fontWeight: "600" }}>Name</th>
                  <th style={{ padding: "16px 20px", fontSize: "12px", textTransform: "uppercase", color: "var(--text-muted)", fontWeight: "600" }}>Phone Number</th>
                  <th style={{ padding: "16px 20px", fontSize: "12px", textTransform: "uppercase", color: "var(--text-muted)", fontWeight: "600" }}>City</th>
                  <th style={{ padding: "16px 20px", fontSize: "12px", textTransform: "uppercase", color: "var(--text-muted)", fontWeight: "600" }}>Added On</th>
                  <th style={{ padding: "16px 20px", width: "60px" }}></th>
                </tr>
              </thead>
              <tbody>
                {filteredContacts.map((c) => (
                  <tr key={c.id} style={{ borderBottom: "1px solid var(--border-color)" }}>
                    <td style={{ padding: "16px 20px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                        <div style={{ width: "32px", height: "32px", borderRadius: "50%", background: "var(--bg-secondary)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-secondary)" }}>
                          <Users size={16} />
                        </div>
                        <span style={{ fontWeight: "500", color: "var(--text-primary)" }}>{c.name || "Unknown"}</span>
                      </div>
                    </td>
                    <td style={{ padding: "16px 20px", color: "var(--text-secondary)" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                        <Phone size={14} />
                        +{c.phone_number}
                        {c.not_on_wp && (
                          <span style={{ fontSize: "12px", background: "rgba(239, 68, 68, 0.1)", color: "#ef4444", padding: "2px 8px", borderRadius: "12px", display: "flex", alignItems: "center", gap: "4px" }}>
                            <AlertCircle size={12} /> Not on WA
                          </span>
                        )}
                      </div>
                    </td>
                    <td style={{ padding: "16px 20px", color: "var(--text-secondary)" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <MapPin size={14} />
                        {c.city || "N/A"}
                      </div>
                    </td>
                    <td style={{ padding: "16px 20px", color: "var(--text-muted)", fontSize: "14px" }}>
                      {new Date(c.created_at).toLocaleDateString()}
                    </td>
                    <td style={{ padding: "16px 20px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                        <Link
                          href={`/chat?contact=${c.id}`}
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "4px",
                            padding: "4px 8px",
                            borderRadius: "6px",
                            background: "rgba(37, 99, 235, 0.08)",
                            color: "var(--accent, #2563eb)",
                            textDecoration: "none",
                            fontSize: "12px",
                            fontWeight: "600",
                          }}
                          title="Open Live Chat / Send WhatsApp Message"
                        >
                          <MessageSquare size={14} />
                          <span>Chat</span>
                        </Link>
                        <button 
                          onClick={() => handleEditClick(c)}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
                          title="Edit Contact"
                        >
                          <Edit size={16} />
                        </button>
                        <button 
                          onClick={() => handleDeleteContact(c.id)}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
                          title="Delete Contact"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showAddModal && (
        <div className="modal-overlay" onClick={() => !adding && setShowAddModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
              <h2 className="modal-title" style={{ margin: 0 }}>Add Contact</h2>
              <button 
                onClick={() => setShowAddModal(false)}
                style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)" }}
                disabled={adding}
              >
                <X size={24} />
              </button>
            </div>
            <form onSubmit={handleAddContact}>
              <div className="form-group">
                <label className="form-label">Name</label>
                <input type="text" className="form-input" value={newName} onChange={e => setNewName(e.target.value)} disabled={adding} placeholder="e.g., Contact Name" />
              </div>
              <div className="form-group">
                <label className="form-label">Mobile Number *</label>
                <input type="text" className="form-input" value={newPhone} onChange={e => setNewPhone(e.target.value)} disabled={adding} required placeholder="10-digit number" />
              </div>
              <div className="form-group">
                <label className="form-label">City</label>
                <input type="text" className="form-input" value={newCity} onChange={e => setNewCity(e.target.value)} disabled={adding} placeholder="e.g., Mumbai" />
              </div>
              <div className="modal-actions" style={{ marginTop: "24px" }}>
                <button type="button" className="btn-secondary" onClick={() => setShowAddModal(false)} disabled={adding}>Cancel</button>
                <button type="submit" className="btn-primary" disabled={adding || !newPhone}>
                  {adding ? "Adding..." : "Add Contact"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showEditModal && (
        <div className="modal-overlay" onClick={() => !editing && setShowEditModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
              <h2 className="modal-title" style={{ margin: 0 }}>Edit Contact</h2>
              <button 
                onClick={() => setShowEditModal(false)}
                style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)" }}
                disabled={editing}
              >
                <X size={24} />
              </button>
            </div>
            <form onSubmit={handleUpdateContact}>
              <div className="form-group">
                <label className="form-label">Name</label>
                <input type="text" className="form-input" value={editName} onChange={e => setEditName(e.target.value)} disabled={editing} placeholder="e.g., Contact Name" />
              </div>
              <div className="form-group">
                <label className="form-label">Mobile Number *</label>
                <input type="text" className="form-input" value={editPhone} onChange={e => setEditPhone(e.target.value)} disabled={editing} required placeholder="10-digit number" />
              </div>
              <div className="form-group">
                <label className="form-label">City</label>
                <input type="text" className="form-input" value={editCity} onChange={e => setEditCity(e.target.value)} disabled={editing} placeholder="e.g., Mumbai" />
              </div>
              <div className="modal-actions" style={{ marginTop: "24px" }}>
                <button type="button" className="btn-secondary" onClick={() => setShowEditModal(false)} disabled={editing}>Cancel</button>
                <button type="submit" className="btn-primary" disabled={editing || !editPhone}>
                  {editing ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
