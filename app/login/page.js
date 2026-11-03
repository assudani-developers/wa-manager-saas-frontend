"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Lock, User, Eye, EyeOff, ArrowRight, ShieldCheck } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
    if (token) {
      router.push("/chat");
    }
    const savedUser = typeof window !== "undefined" ? localStorage.getItem("saved_username") : null;
    if (savedUser) {
      setUsername(savedUser);
    }
  }, [router]);

  const handleLogin = async (e) => {
    e.preventDefault();
    if (loading) return;

    const cleanUsername = username.trim();
    const cleanPassword = password.trim();

    if (!cleanUsername || !cleanPassword) {
      setError("Please enter both username and password.");
      return;
    }

    setError("");
    setLoading(true);

    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "";

    try {
      const res = await fetch(`${apiUrl}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: cleanUsername, password: cleanPassword }),
      });

      const data = await res.json();

      if (res.ok && data.token) {
        localStorage.setItem("token", data.token);
        if (rememberMe) {
          localStorage.setItem("saved_username", cleanUsername);
        } else {
          localStorage.removeItem("saved_username");
        }
        router.push("/chat");
      } else {
        setError(data.error || "Invalid username or password. Please verify credentials.");
      }
    } catch (err) {
      console.error("Login fetch error:", err);
      setError("Unable to connect to server. Please check your internet or try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        position: "relative",
        minHeight: "100vh",
        width: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        backgroundColor: "#f8fafc",
        color: "#0f172a",
        fontFamily: "var(--font-sans)",
        boxSizing: "border-box",
      }}
    >
      {/* Soft ambient background gradient */}
      <div
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundImage:
            "radial-gradient(at 50% 0%, rgba(0, 34, 119, 0.12) 0%, transparent 65%), radial-gradient(at 100% 100%, rgba(37, 99, 235, 0.08) 0%, transparent 60%)",
          pointerEvents: "none",
          zIndex: 0,
        }}
      />

      {/* Main Centered Content */}
      <main
        style={{
          position: "relative",
          zIndex: 5,
          flex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "40px 20px",
          width: "100%",
          boxSizing: "border-box",
        }}
      >
        <div style={{ width: "100%", maxWidth: "420px" }}>
          {/* Logo & Platform Header */}
          <div style={{ textAlign: "center", marginBottom: "28px" }}>
            <div
              style={{
                width: "72px",
                height: "72px",
                margin: "0 auto 16px auto",
                borderRadius: "18px",
                overflow: "hidden",
                boxShadow: "0 10px 28px rgba(0, 34, 119, 0.22)",
                backgroundColor: "#001744",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                border: "2px solid rgba(255, 255, 255, 0.15)",
              }}
            >
              <img
                src="/logo.png"
                alt="Assudani's WP Automation Logo"
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                  display: "block",
                }}
              />
            </div>

            <h1
              style={{
                fontSize: "25px",
                fontWeight: "800",
                letterSpacing: "-0.03em",
                margin: "0 0 6px 0",
                color: "#001744",
              }}
            >
              Assudani&apos;s <span style={{ color: "#2563eb" }}>WP Automation</span>
            </h1>
            <p style={{ fontSize: "14px", color: "#64748b", margin: 0, fontWeight: "500" }}>
              Enterprise WhatsApp Cloud Marketing &amp; CRM Platform
            </p>
          </div>

          {/* Login Card */}
          <div
            style={{
              backgroundColor: "#ffffff",
              border: "1px solid #e2e8f0",
              borderRadius: "18px",
              padding: "36px 32px",
              boxShadow: "0 10px 30px -5px rgba(15, 23, 42, 0.08), 0 1px 3px rgba(0, 0, 0, 0.02)",
              boxSizing: "border-box",
            }}
          >
            <div style={{ marginBottom: "24px" }}>
              <h2
                style={{
                  fontSize: "18px",
                  fontWeight: "700",
                  color: "#0f172a",
                  margin: "0 0 6px 0",
                }}
              >
                Sign In
              </h2>
              <p style={{ fontSize: "13px", color: "#64748b", margin: 0 }}>
                Enter your credentials to access your dashboard
              </p>
            </div>

            {/* Error Message */}
            {error && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  padding: "12px 14px",
                  borderRadius: "10px",
                  backgroundColor: "#fef2f2",
                  border: "1px solid #fee2e2",
                  color: "#dc2626",
                  fontSize: "13px",
                  lineHeight: "1.4",
                  marginBottom: "20px",
                }}
              >
                <span>⚠️</span>
                <span>{error}</span>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleLogin}>
              {/* Username */}
              <div style={{ marginBottom: "18px" }}>
                <label
                  style={{
                    display: "block",
                    fontSize: "13px",
                    fontWeight: "600",
                    color: "#334155",
                    marginBottom: "7px",
                  }}
                >
                  Username or ID
                </label>
                <div style={{ position: "relative" }}>
                  <span
                    style={{
                      position: "absolute",
                      left: "14px",
                      top: "50%",
                      transform: "translateY(-50%)",
                      color: "#94a3b8",
                      display: "flex",
                      alignItems: "center",
                      pointerEvents: "none",
                    }}
                  >
                    <User size={17} />
                  </span>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Enter username"
                    required
                    autoComplete="username"
                    style={{
                      width: "100%",
                      padding: "12px 14px 12px 42px",
                      borderRadius: "10px",
                      backgroundColor: "#ffffff",
                      border: "1px solid #cbd5e1",
                      color: "#0f172a",
                      fontSize: "14px",
                      outline: "none",
                      boxSizing: "border-box",
                      transition: "border-color 0.15s ease, box-shadow 0.15s ease",
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = "#0f3ba8";
                      e.target.style.boxShadow = "0 0 0 3px rgba(15, 59, 168, 0.15)";
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = "#cbd5e1";
                      e.target.style.boxShadow = "none";
                    }}
                  />
                </div>
              </div>

              {/* Password */}
              <div style={{ marginBottom: "18px" }}>
                <label
                  style={{
                    display: "block",
                    fontSize: "13px",
                    fontWeight: "600",
                    color: "#334155",
                    marginBottom: "7px",
                  }}
                >
                  Password
                </label>
                <div style={{ position: "relative" }}>
                  <span
                    style={{
                      position: "absolute",
                      left: "14px",
                      top: "50%",
                      transform: "translateY(-50%)",
                      color: "#94a3b8",
                      display: "flex",
                      alignItems: "center",
                      pointerEvents: "none",
                    }}
                  >
                    <Lock size={17} />
                  </span>
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter password"
                    required
                    autoComplete="current-password"
                    style={{
                      width: "100%",
                      padding: "12px 42px 12px 42px",
                      borderRadius: "10px",
                      backgroundColor: "#ffffff",
                      border: "1px solid #cbd5e1",
                      color: "#0f172a",
                      fontSize: "14px",
                      outline: "none",
                      boxSizing: "border-box",
                      transition: "border-color 0.15s ease, box-shadow 0.15s ease",
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = "#0f3ba8";
                      e.target.style.boxShadow = "0 0 0 3px rgba(15, 59, 168, 0.15)";
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = "#cbd5e1";
                      e.target.style.boxShadow = "none";
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    title={showPassword ? "Hide password" : "Show password"}
                    style={{
                      position: "absolute",
                      right: "12px",
                      top: "50%",
                      transform: "translateY(-50%)",
                      background: "none",
                      border: "none",
                      color: "#94a3b8",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      padding: 0,
                    }}
                  >
                    {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                  </button>
                </div>
              </div>

              {/* Remember Session & Support */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: "22px",
                  fontSize: "13px",
                }}
              >
                <label
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    cursor: "pointer",
                    color: "#64748b",
                  }}
                >
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    style={{
                      accentColor: "#0f3ba8",
                      width: "15px",
                      height: "15px",
                      cursor: "pointer",
                    }}
                  />
                  Remember me
                </label>

                <a
                  href="mailto:support@assudani.com"
                  style={{
                    color: "#0f3ba8",
                    textDecoration: "none",
                    fontWeight: "500",
                  }}
                >
                  Need help?
                </a>
              </div>

              {/* Sign In Button */}
              <button
                type="submit"
                disabled={loading}
                style={{
                  width: "100%",
                  padding: "13px 20px",
                  borderRadius: "10px",
                  background: "linear-gradient(135deg, #0d2b6b 0%, #0f3ba8 60%, #1d4ed8 100%)",
                  color: "#ffffff",
                  border: "none",
                  fontSize: "14px",
                  fontWeight: "600",
                  cursor: loading ? "not-allowed" : "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "8px",
                  transition: "transform 0.1s ease, box-shadow 0.15s ease",
                  boxShadow: "0 4px 14px rgba(15, 59, 168, 0.35)",
                  opacity: loading ? 0.8 : 1,
                }}
                onMouseEnter={(e) => {
                  if (!loading) e.currentTarget.style.boxShadow = "0 6px 18px rgba(15, 59, 168, 0.45)";
                }}
                onMouseLeave={(e) => {
                  if (!loading) e.currentTarget.style.boxShadow = "0 4px 14px rgba(15, 59, 168, 0.35)";
                }}
              >
                {loading ? (
                  <>
                    <div
                      style={{
                        width: "16px",
                        height: "16px",
                        border: "2px solid rgba(255,255,255,0.3)",
                        borderTopColor: "#ffffff",
                        borderRadius: "50%",
                        animation: "spin 0.8s linear infinite",
                      }}
                    />
                    <span>Signing in...</span>
                  </>
                ) : (
                  <>
                    <span>Sign in</span>
                    <ArrowRight size={16} />
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Trust Badge */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px",
              marginTop: "20px",
              fontSize: "12px",
              color: "#64748b",
            }}
          >
            <ShieldCheck size={16} color="#059669" />
            <span>Official Meta Cloud API &bull; End-to-end encrypted session</span>
          </div>
        </div>
      </main>

      {/* Minimal Footer */}
      <footer
        style={{
          position: "relative",
          zIndex: 10,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "16px 32px",
          borderTop: "1px solid rgba(0, 0, 0, 0.05)",
          backgroundColor: "#ffffff",
          fontSize: "12px",
          color: "#64748b",
          flexWrap: "wrap",
          gap: "12px",
        }}
      >
        <span>&copy; 2026 Assudani&apos;s WP Automation. All rights reserved.</span>
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <span
            style={{ color: "#0f3ba8", fontWeight: "600" }}
          >
            Powered by Assudani&apos;s WP Automation
          </span>
          <span>&bull;</span>
          <Link
            href="/privacy"
            style={{ color: "#64748b", textDecoration: "none" }}
          >
            Privacy Policy
          </Link>
        </div>
      </footer>
    </div>
  );
}
