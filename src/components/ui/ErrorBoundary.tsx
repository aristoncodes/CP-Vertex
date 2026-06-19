"use client";

import React from "react";

interface Props {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("[ErrorBoundary]", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <div className="error-boundary">
          <span
            className="material-symbols-outlined"
            style={{ fontSize: 48, color: "var(--danger)", marginBottom: 16, display: "block" }}
          >
            error
          </span>
          <h2 style={{ fontSize: 20, fontWeight: 800, color: "var(--danger)", marginBottom: 8 }}>
            Something went wrong
          </h2>
          <p style={{ fontSize: 14, color: "var(--text-secondary)", marginBottom: 20, maxWidth: 400, margin: "0 auto 20px" }}>
            {this.state.error?.message || "An unexpected error occurred. Please try refreshing the page."}
          </p>
          <button
            className="n-btn-primary"
            onClick={() => {
              this.setState({ hasError: false, error: undefined });
              window.location.reload();
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>refresh</span>
            Reload Page
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
