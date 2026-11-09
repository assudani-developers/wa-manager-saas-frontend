"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Users, Eye, X, ChevronDown, Check, Building, Smartphone, ShieldCheck, ArrowRight } from "lucide-react";
import { getClientsDropdown } from "../lib/api";

let cachedClientsList = null;
let lastClientsListFetch = 0;

export default function ClientSwitcher() {
  const pathname = usePathname();
  const router = useRouter();

  const [isAdmin, setIsAdmin] = useState(false);
  const [clients, setClients] = useState([]);
  const [activeClientId, setActiveClientId] = useState(null);
  const [activeClientName, setActiveClientName] = useState(null);
  const [activeClientMode, setActiveClientMode] = useState(null);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (pathname === "/login") return;

    try {
      const role = localStorage.getItem("user_role");
      const userStr = localStorage.getItem("user");
      const user = userStr ? JSON.parse(userStr) : null;
      // ONLY Master Admin (piyushassudani) can switch clients
      const isMaster = role === "master_admin" || user?.role === "master_admin" || user?.username?.toLowerCase() === "piyushassudani";
      setIsAdmin(isMaster);

      const savedClientId = localStorage.getItem("active_client_id");
      const savedClientName = localStorage.getItem("active_client_name");
      const savedClientMode = localStorage.getItem("active_client_mode");
      setActiveClientId(savedClientId);
      setActiveClientName(savedClientName);
      setActiveClientMode(savedClientMode);

      if (isMaster) {
        const now = Date.now();
        if (cachedClientsList && now - lastClientsListFetch < 60000) {
          setClients(cachedClientsList);
        } else {
          setLoading(true);
          getClientsDropdown()
            .then((res) => {
              const rawList = res.data?.clients || (Array.isArray(res.data) ? res.data : []);
              const list = rawList.filter(
                (c) => c.role !== "master_admin" && c.username?.toLowerCase() !== "piyushassudani"
              );
              cachedClientsList = list;
              lastClientsListFetch = Date.now();
              setClients(list);
            })
            .catch((err) => {
              console.warn("Could not load clients dropdown:", err.message);
            })
            .finally(() => setLoading(false));
        }
      }
    } catch (e) {}
  }, [pathname]);

  if (!isAdmin || pathname === "/login" || (pathname === "/users" && !activeClientId)) {
    return null;
  }

  const handleSelectClient = (client) => {
    if (!client) {
      // Clear client scope, back to Master Admin view
      localStorage.removeItem("active_client_id");
      localStorage.removeItem("active_client_name");
      localStorage.removeItem("active_client_mode");
      setActiveClientId(null);
      setActiveClientName(null);
      setActiveClientMode(null);
    } else {
      localStorage.setItem("active_client_id", client.id);
      localStorage.setItem("active_client_name", client.username);
      localStorage.setItem("active_client_mode", client.whatsapp_mode || "company");
      setActiveClientId(client.id);
      setActiveClientName(client.username);
      setActiveClientMode(client.whatsapp_mode || "company");
    }
    setIsOpen(false);
    window.location.reload();
  };

  return (
    <>
      {/* Impersonation Banner if a client is selected */}
      {activeClientId ? (
        <div
          style={{
            background: "linear-gradient(90deg, #1e1b4b 0%, #312e81 100%)",
            color: "#ffffff",
            padding: "8px 20px",
            fontSize: "13px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            borderBottom: "1px solid rgba(255, 255, 255, 0.15)",
            zIndex: 998,
            boxShadow: "0 2px 8px rgba(0, 0, 0, 0.2)",
            flexShrink: 0,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "5px",
                padding: "2px 8px",
                borderRadius: "12px",
                background: "rgba(238, 242, 255, 0.2)",
                fontSize: "11px",
                fontWeight: 700,
                letterSpacing: "0.5px",
                textTransform: "uppercase",
              }}
            >
              <Eye size={12} />
              Viewing Client
            </span>
            <span style={{ fontWeight: 700, fontSize: "14px" }}>{activeClientName}</span>
            <span
              style={{
                fontSize: "11px",
                padding: "2px 8px",
                borderRadius: "10px",
                background: activeClientMode === "personal" ? "rgba(168, 85, 247, 0.3)" : "rgba(16, 185, 129, 0.3)",
                color: "#ffffff",
                display: "inline-flex",
                alignItems: "center",
                gap: "4px",
                fontWeight: 600,
              }}
            >
              {activeClientMode === "personal" ? <Smartphone size={12} /> : <Building size={12} />}
              {activeClientMode === "personal" ? "Personal Meta API" : "Company Number"}
            </span>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            {/* Quick Switch Dropdown Trigger */}
            <div style={{ position: "relative" }}>
              <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                style={{
                  background: "rgba(255, 255, 255, 0.12)",
                  border: "1px solid rgba(255, 255, 255, 0.25)",
                  color: "#ffffff",
                  borderRadius: "6px",
                  padding: "5px 10px",
                  fontSize: "12px",
                  cursor: "pointer",
                  fontWeight: 600,
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                }}
              >
                <span>Switch Client</span>
                <ChevronDown size={13} style={{ transform: isOpen ? "rotate(180deg)" : "none", transition: "transform 0.15s" }} />
              </button>

              {isOpen && (
                <>
                  <div onClick={() => setIsOpen(false)} style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, zIndex: 999 }} />
                  <div
                    style={{
                      position: "absolute",
                      top: "calc(100% + 6px)",
                      right: 0,
                      width: "280px",
                      background: "var(--bg-secondary)",
                      border: "1px solid var(--border-color)",
                      borderRadius: "12px",
                      boxShadow: "0 10px 25px rgba(0, 0, 0, 0.2)",
                      padding: "8px",
                      zIndex: 1000,
                      color: "var(--text-primary)",
                    }}
                  >
                    <div style={{ padding: "6px 10px", fontSize: "11px", fontWeight: 700, textTransform: "uppercase", color: "var(--text-muted)" }}>
                      Select Client Workspace
                    </div>
                    <div
                      onClick={() => handleSelectClient(null)}
                      style={{
                        padding: "8px 10px",
                        borderRadius: "8px",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                        fontSize: "13px",
                        color: "#002277",
                        fontWeight: 600,
                      }}
                    >
                      <Building size={14} />
                      👑 Master Admin (All View)
                    </div>
                    <div style={{ maxHeight: "200px", overflowY: "auto" }}>
                      {clients.map((c) => (
                        <div
                          key={c.id}
                          onClick={() => handleSelectClient(c)}
                          style={{
                            padding: "8px 10px",
                            borderRadius: "8px",
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            fontSize: "13px",
                            background: activeClientId === c.id ? "rgba(99, 102, 241, 0.1)" : "transparent",
                          }}
                        >
                          <span>{c.username}</span>
                          {activeClientId === c.id && <Check size={14} color="#4f46e5" />}
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>

            <button
              onClick={() => handleSelectClient(null)}
              style={{
                background: "rgba(255, 255, 255, 0.18)",
                border: "1px solid rgba(255, 255, 255, 0.35)",
                color: "#ffffff",
                borderRadius: "6px",
                padding: "5px 12px",
                fontSize: "12px",
                cursor: "pointer",
                fontWeight: 600,
                display: "flex",
                alignItems: "center",
                gap: "5px",
              }}
            >
              <X size={13} />
              Exit Client View
            </button>
          </div>
        </div>
      ) : (
        /* Standard Top Admin Bar when viewing Global Master View */
        <div
          style={{
            background: "var(--bg-secondary)",
            borderBottom: "1px solid var(--border-color)",
            padding: "8px 20px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexShrink: 0,
            fontSize: "13px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <span
              style={{
                fontSize: "11px",
                padding: "2px 8px",
                borderRadius: "6px",
                background: "rgba(0, 34, 119, 0.08)",
                color: "#002277",
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.5px",
                display: "inline-flex",
                alignItems: "center",
                gap: "4px",
              }}
            >
              <ShieldCheck size={13} />
              Admin Mode
            </span>
            <span style={{ color: "var(--text-muted)", fontSize: "12.5px" }}>
              Global View • All SaaS Clients
            </span>
          </div>

          <div style={{ position: "relative" }}>
            <button
              type="button"
              onClick={() => setIsOpen(!isOpen)}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                padding: "6px 12px",
                borderRadius: "8px",
                background: "var(--bg-tertiary)",
                border: "1px solid var(--border-color)",
                color: "var(--text-primary)",
                fontSize: "12.5px",
                fontWeight: 600,
                cursor: "pointer",
                transition: "all 0.15s ease",
              }}
            >
              <Users size={14} color="#002277" />
              <span>Select Client to View</span>
              <ChevronDown size={14} style={{ transform: isOpen ? "rotate(180deg)" : "none", transition: "transform 0.15s" }} />
            </button>

            {isOpen && (
              <>
                <div onClick={() => setIsOpen(false)} style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, zIndex: 999 }} />
                <div
                  style={{
                    position: "absolute",
                    top: "calc(100% + 6px)",
                    right: 0,
                    width: "280px",
                    background: "var(--bg-secondary)",
                    border: "1px solid var(--border-color)",
                    borderRadius: "12px",
                    boxShadow: "0 10px 25px rgba(0, 0, 0, 0.15)",
                    padding: "8px",
                    zIndex: 1000,
                  }}
                >
                  <div
                    style={{
                      padding: "8px 10px",
                      fontSize: "11px",
                      fontWeight: 700,
                      textTransform: "uppercase",
                      letterSpacing: "0.5px",
                      color: "var(--text-muted)",
                      borderBottom: "1px solid var(--border-color)",
                      marginBottom: "4px",
                    }}
                  >
                    Switch to Client Account
                  </div>

                  <div
                    onClick={() => handleSelectClient(null)}
                    style={{
                      padding: "10px 12px",
                      borderRadius: "8px",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      background: "rgba(0, 34, 119, 0.08)",
                      color: "#002277",
                      fontWeight: 700,
                      fontSize: "13px",
                      marginBottom: "4px",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <Building size={15} />
                      <span>👑 Master Admin (All View)</span>
                    </div>
                    <Check size={14} color="#002277" />
                  </div>

                  <div style={{ maxHeight: "240px", overflowY: "auto" }}>
                    {clients
                      .filter((c) => c.role !== "master_admin")
                      .map((client) => {
                        const isPersonal = client.whatsapp_mode === "personal";
                        return (
                          <div
                            key={client.id}
                            onClick={() => handleSelectClient(client)}
                            style={{
                              padding: "8px 12px",
                              borderRadius: "8px",
                              cursor: "pointer",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "space-between",
                              transition: "background 0.1s",
                              fontSize: "13px",
                            }}
                            onMouseEnter={(e) => (e.currentTarget.style.background = "var(--bg-tertiary)")}
                            onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                          >
                            <div>
                              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                                <span style={{ fontWeight: 600, color: "var(--text-primary)" }}>{client.username}</span>
                                <span
                                  style={{
                                    fontSize: "10px",
                                    padding: "1px 6px",
                                    borderRadius: "8px",
                                    background: isPersonal ? "rgba(124, 58, 237, 0.12)" : "rgba(5, 150, 105, 0.12)",
                                    color: isPersonal ? "#7c3aed" : "#059669",
                                    fontWeight: 600,
                                  }}
                                >
                                  {isPersonal ? "Personal API" : "Company"}
                                </span>
                              </div>
                              <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>
                                {client.meta_display_phone_number || (isPersonal ? "Custom API" : "Company Channel")}
                              </div>
                            </div>
                            <ArrowRight size={13} color="var(--text-muted)" />
                          </div>
                        );
                      })}
                  </div>

                  <div
                    style={{
                      borderTop: "1px solid var(--border-color)",
                      marginTop: "6px",
                      paddingTop: "6px",
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => {
                        setIsOpen(false);
                        router.push("/users");
                      }}
                      style={{
                        width: "100%",
                        textAlign: "center",
                        padding: "8px",
                        borderRadius: "6px",
                        background: "transparent",
                        border: "none",
                        color: "var(--accent)",
                        fontSize: "12px",
                        fontWeight: 600,
                        cursor: "pointer",
                      }}
                    >
                      Manage All Clients &amp; Users →
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
