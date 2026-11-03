"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  MessageCircle,
  Megaphone,
  Activity,
  Users,
  Reply,
  Settings,
  Image as ImageIcon,
  LayoutTemplate,
  LogOut,
  LayoutDashboard,
} from "lucide-react";
import AccountHealthModal from "./AccountHealthModal";
import BrandLogo from "./BrandLogo";

export default function SidebarNav() {
  const pathname = usePathname();
  const router = useRouter();
  const [isHealthModalOpen, setIsHealthModalOpen] = useState(false);

  if (pathname === "/login") {
    return null;
  }

  const navItems = [
    { href: "/chat", icon: MessageCircle, label: "Live Chat" },
    { href: "/dashboard", icon: LayoutDashboard, label: "Analytics" },
    // { href: "/replies", icon: Reply, label: "All Replies" }, // Hidden per request (code preserved)
    { href: "/contacts", icon: Users, label: "Contact Lists" },
    { href: "/campaigns", icon: Megaphone, label: "Campaigns" },
    { href: "/media", icon: ImageIcon, label: "Media Library" },
    { href: "/templates", icon: LayoutTemplate, label: "Templates" },
  ];

  const mobileNavItems = [
    { href: "/chat", icon: MessageCircle, label: "Chat" },
    { href: "/dashboard", icon: LayoutDashboard, label: "Stats" },
    { href: "/contacts", icon: Users, label: "Contacts" },
    { href: "/campaigns", icon: Megaphone, label: "Campaigns" },
    { href: "/templates", icon: LayoutTemplate, label: "Templates" },
    { href: "/settings", icon: Settings, label: "Settings" },
  ];

  const handleLogout = () => {
    localStorage.removeItem("token");
    router.push("/login");
  };

  return (
    <>
      {/* Mobile Top Header (<= 768px) */}
      <header className="mobile-header">
        <Link href="/chat" style={{ textDecoration: "none", display: "flex", alignItems: "center" }}>
          <BrandLogo size={32} showText />
        </Link>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <button
            type="button"
            onClick={() => setIsHealthModalOpen(true)}
            title="Meta Health"
            style={{
              background: "rgba(16, 185, 129, 0.12)",
              border: "1px solid rgba(16, 185, 129, 0.25)",
              borderRadius: "8px",
              padding: "6px 10px",
              display: "flex",
              alignItems: "center",
              gap: "6px",
              color: "#059669",
              cursor: "pointer",
              fontSize: "12px",
              fontWeight: 600,
            }}
          >
            <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#10b981", boxShadow: "0 0 6px #10b981" }} />
            <Activity size={14} />
          </button>
          <button
            type="button"
            onClick={handleLogout}
            title="Sign Out"
            style={{
              background: "none",
              border: "none",
              color: "var(--text-muted)",
              cursor: "pointer",
              padding: "6px",
              display: "flex",
              alignItems: "center",
            }}
          >
            <LogOut size={18} />
          </button>
        </div>
      </header>

      {/* Desktop Vertical Sidebar (> 768px) */}
      <nav className="sidebar-nav">
        {/* Brand Mark */}
        <Link href="/chat" style={{ textDecoration: "none", marginBottom: "16px" }} title="Assudani WA Automations">
          <BrandLogo size={42} iconOnly />
        </Link>

        {/* Primary Navigation Icons */}
        <div style={{ display: "flex", flexDirection: "column", gap: "6px", width: "100%", alignItems: "center" }}>
          {navItems.map((item) => {
            const isActive =
              pathname === item.href || pathname?.startsWith(item.href + "/");
            return (
              <Link key={item.href} href={item.href} title={item.label} style={{ textDecoration: "none" }}>
                <div className={`nav-item ${isActive ? "active" : ""}`}>
                  <item.icon size={21} strokeWidth={isActive ? 2.4 : 2} />
                  <span className="nav-tooltip">{item.label}</span>
                </div>
              </Link>
            );
          })}
        </div>

        {/* Settings */}
        <div style={{ width: "100%", display: "flex", justifyContent: "center", marginTop: "6px" }}>
          <Link href="/settings" title="Settings" style={{ textDecoration: "none" }}>
            <div className={`nav-item ${pathname === "/settings" ? "active" : ""}`}>
              <Settings size={21} strokeWidth={pathname === "/settings" ? 2.4 : 2} />
              <span className="nav-tooltip">Settings</span>
            </div>
          </Link>
        </div>

        <div className="nav-spacer" />

        {/* Account Health Trigger */}
        <div
          className="nav-item"
          title="Meta Cloud Health"
          onClick={() => setIsHealthModalOpen(true)}
          style={{ cursor: "pointer", position: "relative" }}
        >
          <Activity size={20} />
          <span
            style={{
              position: "absolute",
              top: "10px",
              right: "10px",
              width: "8px",
              height: "8px",
              borderRadius: "50%",
              background: "#10b981",
              boxShadow: "0 0 6px #10b981",
            }}
          />
          <span className="nav-tooltip">Meta Health</span>
        </div>

        {/* Logout */}
        <div
          className="nav-item logout-btn"
          title="Sign Out"
          onClick={handleLogout}
          style={{ cursor: "pointer", margin: "4px 0" }}
        >
          <LogOut size={20} />
          <span className="nav-tooltip">Log Out</span>
        </div>

        <span className="nav-version">v2.4 Pro</span>
      </nav>

      {/* Mobile Bottom Navigation Bar (<= 768px) */}
      <nav className="mobile-bottom-nav">
        {mobileNavItems.map((item) => {
          const isActive =
            pathname === item.href || pathname?.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`mobile-nav-item ${isActive ? "active" : ""}`}
            >
              <item.icon size={20} strokeWidth={isActive ? 2.4 : 2} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <AccountHealthModal
        isOpen={isHealthModalOpen}
        onClose={() => setIsHealthModalOpen(false)}
      />
    </>
  );
}
