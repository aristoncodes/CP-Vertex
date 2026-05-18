"use client";
import { useState, useEffect, useRef } from "react";
import { cfApiFetch } from "./useCFCache";

interface SystemStatus {
  judgeQueue: number; throughput: number; apiUp: boolean; degraded: boolean;
}

export function useSystemHealth() {
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<SystemStatus>({ judgeQueue: 0, throughput: 100, apiUp: true, degraded: false });

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        // system.status doesn't exist in CF API, we simulate with a check
        const start = Date.now();
        await cfApiFetch<any[]>("user.info", { handles: "tourist" });
        const latency = Date.now() - start;
        setStatus({
          judgeQueue: latency, throughput: latency < 2000 ? 98 : latency < 5000 ? 85 : 70,
          apiUp: true, degraded: latency > 3000,
        });
      } catch {
        setStatus({ judgeQueue: 0, throughput: 0, apiUp: false, degraded: true });
      } finally { setLoading(false); }
    };
    fetchStatus();
    const interval = setInterval(fetchStatus, 60000);
    return () => clearInterval(interval);
  }, []);

  return { status, loading };
}
