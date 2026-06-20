"use client";

import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useState } from "react";

export default function ReportBugPage() {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [steps, setSteps] = useState("");
  const [priority, setPriority] = useState("Medium");

  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !description.trim()) {
      setStatus("error");
      setErrorMessage("Please provide a title and description.");
      return;
    }

    if (title.trim().length < 3) {
      setStatus("error");
      setErrorMessage("Title must be at least 3 characters.");
      return;
    }

    if (description.trim().length < 10) {
      setStatus("error");
      setErrorMessage("Description must be at least 10 characters.");
      return;
    }

    setStatus("submitting");

    try {
      const res = await fetch("/api/report-bug", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: title.trim(), description: description.trim(), steps: steps.trim(), priority }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to submit bug report.");
      }

      setStatus("success");
      setTitle("");
      setDescription("");
      setSteps("");
      setPriority("Medium");
      setTimeout(() => setStatus("idle"), 5000);
    } catch (err: unknown) {
      setStatus("error");
      setErrorMessage(err instanceof Error ? err.message : "Failed to submit bug report. Please try again later.");
    }
  };

  return (
    <DashboardLayout>
      {/* Header */}
      <div>
        <h1 style={{ fontSize: 24, fontWeight: 800, letterSpacing: "-0.02em", color: "var(--text-primary)", display: "flex", alignItems: "center", gap: 10 }}>
          <span className="material-symbols-outlined" style={{ fontSize: 28, color: "var(--danger)", fontVariationSettings: "'FILL' 1" }}>bug_report</span>
          Report a Bug
        </h1>
        <p style={{ fontSize: 14, color: "var(--text-muted)", marginTop: 4, fontWeight: 500 }}>
          Found an issue with CP Vertex? Let us know so we can fix it!
        </p>
      </div>

      {/* Success banner */}
      {status === "success" && (
        <div style={{
          display: "flex", alignItems: "center", gap: 12, padding: "14px 20px",
          background: "var(--success-light)", border: "1px solid rgba(5,150,105,0.2)",
          borderRadius: "var(--radius-md)",
        }}>
          <span className="material-symbols-outlined" style={{ fontSize: 22, color: "var(--success)", fontVariationSettings: "'FILL' 1" }}>check_circle</span>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: "var(--success)" }}>Bug Report Submitted</div>
            <p style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 2 }}>Thank you for your report! Our team will look into this issue shortly.</p>
          </div>
        </div>
      )}

      {/* Error banner */}
      {status === "error" && (
        <div style={{
          display: "flex", alignItems: "center", gap: 12, padding: "14px 20px",
          background: "var(--danger-light)", border: "1px solid rgba(220,38,38,0.2)",
          borderRadius: "var(--radius-md)",
        }}>
          <span className="material-symbols-outlined" style={{ fontSize: 22, color: "var(--danger)" }}>error</span>
          <span style={{ fontSize: 14, color: "var(--danger)" }}>{errorMessage}</span>
        </div>
      )}

      {/* Form Card */}
      <form onSubmit={handleSubmit}>
        <div className="n-card" style={{ padding: 24 }}>
          {/* Bug Title */}
          <div style={{ marginBottom: 24 }}>
            <label style={{ display: "block", fontSize: 14, fontWeight: 600, color: "var(--text-primary)", marginBottom: 8 }}>
              Bug Title <span style={{ color: "var(--danger)" }}>*</span>
            </label>
            <input
              type="text" value={title} onChange={e => setTitle(e.target.value)}
              placeholder="E.g., Virtual contest timer resets on refresh"
              className="n-input" disabled={status === "submitting"}
            />
          </div>

          {/* Description */}
          <div style={{ marginBottom: 24 }}>
            <label style={{ display: "block", fontSize: 14, fontWeight: 600, color: "var(--text-primary)", marginBottom: 8 }}>
              Description <span style={{ color: "var(--danger)" }}>*</span>
            </label>
            <textarea
              value={description} onChange={e => setDescription(e.target.value)}
              placeholder="What exactly went wrong? What did you expect to happen?"
              className="n-input" disabled={status === "submitting"}
              style={{ resize: "vertical", minHeight: 120 }}
            />
          </div>

          {/* Steps to reproduce */}
          <div style={{ marginBottom: 24 }}>
            <label style={{ display: "block", fontSize: 14, fontWeight: 600, color: "var(--text-primary)", marginBottom: 8 }}>
              Steps to Reproduce
            </label>
            <textarea
              value={steps} onChange={e => setSteps(e.target.value)}
              placeholder={"1. Go to...\n2. Click on...\n3. See error..."}
              className="n-input" disabled={status === "submitting"}
              style={{ resize: "vertical", minHeight: 100 }}
            />
          </div>

          {/* Priority */}
          <div style={{ marginBottom: 32 }}>
            <label style={{ display: "block", fontSize: 14, fontWeight: 600, color: "var(--text-primary)", marginBottom: 8 }}>
              Severity / Priority
            </label>
            <select
              value={priority} onChange={e => setPriority(e.target.value)}
              className="n-input" disabled={status === "submitting"}
              style={{ maxWidth: 360, cursor: "pointer" }}
            >
              <option value="Low">Low — Minor cosmetic issue</option>
              <option value="Medium">Medium — Feature isn&apos;t working right</option>
              <option value="High">High — Core functionality is broken</option>
              <option value="Critical">Critical — App crashes or data loss</option>
            </select>
          </div>

          {/* Submit */}
          <div style={{ borderTop: "1px solid var(--border)", paddingTop: 20, display: "flex", justifyContent: "flex-end" }}>
            <button type="submit" disabled={status === "submitting"} className="n-btn-primary" style={{ padding: "12px 32px", fontSize: 14, opacity: status === "submitting" ? 0.6 : 1 }}>
              {status === "submitting" ? (
                <>
                  <span style={{ width: 16, height: 16, border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "white", borderRadius: "50%", display: "inline-block", animation: "spin 1s linear infinite" }} />
                  Submitting...
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined" style={{ fontSize: 18 }}>send</span>
                  Submit Report
                </>
              )}
            </button>
          </div>
        </div>
      </form>
    </DashboardLayout>
  );
}
