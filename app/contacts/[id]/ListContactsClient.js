"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Users, Phone, MapPin, Plus, Trash2, X, Edit, AlertCircle, MessageSquare } from "lucide-react";
import { getListContacts, deleteContact, addContactToList, updateContact } from "../../lib/api";
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

  return (
    <div className="page-container">
      <div className="page-header">
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <Link href="/contacts" className="btn-secondary" style={{ padding: "10px" }}>
            <ArrowLeft size={20} />
          </Link>
          <div>
            <h1 className="page-title">List Members</h1>
            <p style={{ color: "var(--text-muted)", fontSize: "14px", marginTop: "4px" }}>
              Total: {contacts.length} members
            </p>
          </div>
        </div>
        <button className="btn-primary" onClick={() => setShowAddModal(true)}>
          <Plus size={18} />
          Add Contact
        </button>
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
        ) : contacts.length === 0 ? (
          <div style={{ padding: "40px", textAlign: "center", color: "var(--text-muted)", background: "var(--bg-tertiary)", borderRadius: "12px" }}>
            No contacts found in this list.
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
                {contacts.map((c) => (
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
