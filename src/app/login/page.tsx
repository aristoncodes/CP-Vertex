"use client";

import { useState, useEffect } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";

type Mode = "login" | "signup";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("login");
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Form fields
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [cfHandle, setCfHandle] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      if (mode === "signup") {
        const res = await fetch("/api/auth/signup", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, email, password, cfHandle }),
        });

        const data = await res.json();
        if (!res.ok) {
          setError(data.error || "Signup failed.");
          setLoading(false);
          return;
        }
      }

      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        setError(mode === "signup" ? "Account created but login failed. Try logging in." : "Invalid email or password.");
        setLoading(false);
        return;
      }

      window.location.href = "/dashboard";
    } catch (err) {
      console.error("Login Error:", err);
      setError("Connection failed. Please try again.");
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "var(--surface)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "40px 24px",
        fontFamily: "'Inter', sans-serif",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 440,
          opacity: mounted ? 1 : 0,
          transform: mounted ? "translateY(0)" : "translateY(16px)",
          transition: "opacity 0.5s ease, transform 0.5s ease",
        }}
      >
        {/* Logo */}
        <Link
          href="/"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 10,
            marginBottom: 40,
            textDecoration: "none",
          }}
        >
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              background: "linear-gradient(135deg, #004fa8, #0366d6)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "white",
              fontSize: 14,
              fontWeight: 800,
            }}
          >
            CA
          </div>
          <span style={{ fontSize: 24, fontWeight: 800, color: "var(--text-primary)", letterSpacing: "-0.03em" }}>
            Code<span style={{ color: "var(--primary)" }}>Arena</span>
          </span>
        </Link>

        {/* Card */}
        <div
          style={{
            background: "var(--surface-card)",
            borderRadius: 16,
            border: "1px solid var(--border)",
            padding: "36px 32px",
            boxShadow: "0 4px 24px rgba(0,0,0,0.06)",
          }}
        >
          {/* Mode tabs */}
          <div
            style={{
              display: "flex",
              gap: 0,
              marginBottom: 28,
              borderBottom: "1px solid var(--border)",
            }}
          >
            {(["login", "signup"] as Mode[]).map((m) => (
              <button
                key={m}
                onClick={() => { setMode(m); setError(""); }}
                style={{
                  flex: 1,
                  padding: "12px 0",
                  fontSize: 14,
                  fontWeight: mode === m ? 600 : 500,
                  color: mode === m ? "var(--primary)" : "var(--text-muted)",
                  background: "transparent",
                  border: "none",
                  borderBottom: mode === m ? "2px solid var(--primary)" : "2px solid transparent",
                  cursor: "pointer",
                  fontFamily: "'Inter', sans-serif",
                  transition: "all 0.2s",
                }}
              >
                {m === "login" ? "Sign In" : "Create Account"}
              </button>
            ))}
          </div>

          {/* Error */}
          {error && (
            <div
              style={{
                padding: "10px 14px",
                marginBottom: 20,
                background: "rgba(220,38,38,0.06)",
                border: "1px solid rgba(220,38,38,0.15)",
                borderRadius: 10,
                fontSize: 13,
                fontWeight: 500,
                color: "#dc2626",
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: 18 }}>error</span>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            {/* Name — signup only */}
            {mode === "signup" && (
              <div>
                <label style={labelStyle}>Name</label>
                <input
                  type="text"
                  placeholder="Your display name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  style={inputStyle}
                />
              </div>
            )}

            {/* Email */}
            <div>
              <label style={labelStyle}>Email</label>
              <input
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                style={inputStyle}
              />
            </div>

            {/* Password */}
            <div>
              <label style={labelStyle}>Password</label>
              <div style={{ position: "relative" }}>
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder={mode === "signup" ? "Min 6 characters" : "Enter password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={mode === "signup" ? 6 : undefined}
                  autoComplete={mode === "signup" ? "new-password" : "current-password"}
                  style={inputStyle}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: "absolute",
                    right: 12,
                    top: "50%",
                    transform: "translateY(-50%)",
                    background: "none",
                    border: "none",
                    color: "var(--text-muted)",
                    cursor: "pointer",
                    fontSize: 13,
                    fontWeight: 500,
                    fontFamily: "'Inter', sans-serif",
                  }}
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
            </div>

            {/* CF Handle — signup only */}
            {mode === "signup" && (
              <div>
                <label style={labelStyle}>
                  Codeforces Handle
                  <span style={{ color: "#9ca3af", fontWeight: 400, marginLeft: 8, fontSize: 12 }}>optional</span>
                </label>
                <input
                  type="text"
                  placeholder="your_cf_handle"
                  value={cfHandle}
                  onChange={(e) => setCfHandle(e.target.value)}
                  style={inputStyle}
                />
                <p style={{ fontSize: 12, color: "#9ca3af", marginTop: 6, lineHeight: 1.5 }}>
                  Link your Codeforces account to sync submissions & rating. You can do this later in Settings.
                </p>
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="n-btn-primary"
              style={{
                width: "100%",
                padding: "14px 0",
                fontSize: 15,
                marginTop: 4,
                opacity: loading ? 0.6 : 1,
                cursor: loading ? "not-allowed" : "pointer",
              }}
            >
              {loading ? "Processing..." : mode === "login" ? "Sign In →" : "Create Account →"}
            </button>
          </form>

          {/* Divider */}
          <div style={{ display: "flex", alignItems: "center", gap: 16, margin: "24px 0" }}>
            <div style={{ flex: 1, height: 1, background: "var(--border)" }} />
            <span style={{ fontSize: 12, color: "var(--text-faint)", fontWeight: 500 }}>or</span>
            <div style={{ flex: 1, height: 1, background: "var(--border)" }} />
          </div>

          {/* OAuth */}
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <button
              type="button"
              onClick={() => signIn("google", { callbackUrl: "/dashboard" })}
              style={oauthBtnStyle}
            >
              <svg width="18" height="18" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
              </svg>
              Continue with Google
            </button>
          </div>
        </div>

        {/* Switch mode */}
        <div style={{ textAlign: "center", marginTop: 24 }}>
          <button
            onClick={() => { setMode(mode === "login" ? "signup" : "login"); setError(""); }}
            style={{
              background: "none",
              border: "none",
              fontSize: 14,
              color: "var(--text-muted)",
              cursor: "pointer",
              fontFamily: "'Inter', sans-serif",
            }}
          >
            {mode === "login" ? (
              <>Don&apos;t have an account? <span style={{ color: "var(--primary)", fontWeight: 600 }}>Sign up</span></>
            ) : (
              <>Already have an account? <span style={{ color: "var(--primary)", fontWeight: 600 }}>Sign in</span></>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: 13,
  fontWeight: 600,
  color: "var(--text-secondary)",
  marginBottom: 6,
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  fontSize: 14,
  padding: "11px 14px",
  background: "var(--surface-high)",
  color: "var(--text-primary)",
  border: "1px solid var(--border)",
  borderRadius: 10,
  outline: "none",
  fontFamily: "'Inter', sans-serif",
  transition: "border-color 0.2s",
};

const oauthBtnStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 10,
  padding: "12px 0",
  fontSize: 14,
  fontWeight: 500,
  width: "100%",
  background: "var(--surface-high)",
  border: "1px solid var(--border)",
  borderRadius: 10,
  cursor: "pointer",
  color: "var(--text-secondary)",
  fontFamily: "'Inter', sans-serif",
  transition: "border-color 0.15s, background 0.15s",
};
