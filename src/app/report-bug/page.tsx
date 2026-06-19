"use client";

import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useState } from "react";
import { Bug, Send, CheckCircle2, AlertCircle } from "lucide-react";

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

    setStatus("submitting");

    // Simulate an API call
    try {
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Successfully "submitted"
      setStatus("success");
      setTitle("");
      setDescription("");
      setSteps("");
      setPriority("Medium");
      
      // Reset success state after a few seconds
      setTimeout(() => setStatus("idle"), 5000);
    } catch (err) {
      setStatus("error");
      setErrorMessage("Failed to submit bug report. Please try again later.");
    }
  };

  return (
    <DashboardLayout>
      <div className="max-w-3xl mx-auto py-6">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-3">
            <Bug className="w-6 h-6 text-red-500" />
            Report a Bug
          </h1>
          <p className="text-sm text-slate-400 mt-2">
            Found an issue with CP Vertex? Let us know so we can fix it!
          </p>
        </div>

        {status === "success" && (
          <div className="mb-6 p-4 bg-green-500/10 border border-green-500/20 rounded-xl flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-green-500 mt-0.5 shrink-0" />
            <div>
              <h3 className="text-sm font-semibold text-green-400">Bug Report Submitted</h3>
              <p className="text-xs text-green-500/80 mt-1">
                Thank you for your report! Our team will look into this issue shortly.
              </p>
            </div>
          </div>
        )}

        {status === "error" && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />
            <p className="text-sm text-red-400">{errorMessage}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="n-card p-6 space-y-6">
          {/* Title */}
          <div>
            <label className="block text-sm font-semibold text-slate-200 mb-2">
              Bug Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="E.g., Virtual contest timer resets on refresh"
              className="w-full bg-slate-900/50 border border-slate-700/50 rounded-lg p-3 text-sm text-slate-200 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 transition-all"
              disabled={status === "submitting"}
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-semibold text-slate-200 mb-2">
              Description <span className="text-red-500">*</span>
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What exactly went wrong? What did you expect to happen?"
              className="w-full h-32 bg-slate-900/50 border border-slate-700/50 rounded-lg p-3 text-sm text-slate-200 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 transition-all resize-y"
              disabled={status === "submitting"}
            />
          </div>

          {/* Steps to reproduce */}
          <div>
            <label className="block text-sm font-semibold text-slate-200 mb-2">
              Steps to Reproduce
            </label>
            <textarea
              value={steps}
              onChange={(e) => setSteps(e.target.value)}
              placeholder="1. Go to...\n2. Click on...\n3. See error..."
              className="w-full h-24 bg-slate-900/50 border border-slate-700/50 rounded-lg p-3 text-sm text-slate-200 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 transition-all resize-y"
              disabled={status === "submitting"}
            />
          </div>

          {/* Priority */}
          <div>
            <label className="block text-sm font-semibold text-slate-200 mb-2">
              Severity / Priority
            </label>
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
              className="w-full md:w-64 bg-slate-900/50 border border-slate-700/50 rounded-lg p-3 text-sm text-slate-200 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 transition-all"
              disabled={status === "submitting"}
            >
              <option value="Low">Low - Minor cosmetic issue</option>
              <option value="Medium">Medium - Feature isn't working right</option>
              <option value="High">High - Core functionality is broken</option>
              <option value="Critical">Critical - App crashes or data loss</option>
            </select>
          </div>

          {/* Submit Button */}
          <div className="pt-4 border-t border-slate-800 flex justify-end">
            <button
              type="submit"
              disabled={status === "submitting"}
              className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-lg flex items-center gap-2 transition-colors"
            >
              {status === "submitting" ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  Submit Report
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </DashboardLayout>
  );
}
