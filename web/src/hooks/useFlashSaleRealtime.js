import { useEffect, useRef, useState } from "react";
import { api } from "../lib/axios";
import { realtimeBus } from "../lib/realtimeBus";

export function formatCountdown(seconds) {
  const safe = Math.max(0, Number(seconds) || 0);
  const h = Math.floor(safe / 3600);
  const m = Math.floor((safe % 3600) / 60);
  const s = safe % 60;
  return [h, m, s].map((v) => String(v).padStart(2, "0")).join(":");
}

export function getSessionTargetTimestamp(session) {
  if (!session) return null;
  if (session.is_ended) return null;
  const targetIso = session.is_upcoming ? session.start_time : session.end_time;
  if (!targetIso) return null;
  const parsed = Date.parse(targetIso);
  return Number.isFinite(parsed) ? parsed : null;
}

export function computeRemainingSeconds(session, nowMs = Date.now()) {
  if (!session || session.is_ended) return 0;
  const targetMs = getSessionTargetTimestamp(session);
  if (targetMs !== null) {
    return Math.max(0, Math.floor((targetMs - nowMs) / 1000));
  }
  return Math.max(0, Number(session.time_remaining_seconds || 0));
}

export function useNowTick(intervalMs = 1000) {
  const [nowMs, setNowMs] = useState(() => Date.now());

  useEffect(() => {
    const tick = () => setNowMs(Date.now());
    const timer = window.setInterval(tick, intervalMs);
    const onVisible = () => {
      if (document.visibilityState === "visible") tick();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [intervalMs]);

  return nowMs;
}

export function useFlashSaleRealtime(onUpdate, { pollIntervalMs = 5000, enabled = true } = {}) {
  const callbackRef = useRef(onUpdate);
  callbackRef.current = onUpdate;

  useEffect(() => {
    if (!enabled || typeof window === "undefined") return undefined;

    let sseConnected = false;
    let eventSource = null;

    const trigger = (meta) => {
      try {
        callbackRef.current?.(meta);
      } catch (err) {
        console.error("useFlashSaleRealtime callback error:", err);
      }
    };

    // 1. Server-Sent Events (SSE) for cross-browser / cross-device real-time push
    if ("EventSource" in window) {
      const baseUrl = String(api.defaults.baseURL || "").replace(/\/$/, "");
      const streamUrl = `${baseUrl}/flash-sales/stream/`;
      try {
        eventSource = new EventSource(streamUrl);
        eventSource.addEventListener("connected", () => {
          sseConnected = true;
        });
        eventSource.addEventListener("flash_sale_update", (event) => {
          let payload = null;
          try {
            payload = event?.data ? JSON.parse(event.data) : null;
          } catch {
            payload = null;
          }
          trigger({ source: "sse", payload });
        });
        eventSource.onerror = () => {
          sseConnected = false;
        };
      } catch {
        sseConnected = false;
      }
    }

    // 2. Same-browser BroadcastChannel / localStorage sync (<10ms)
    const unsubscribeBus = realtimeBus.subscribe((event) => {
      if (event?.type === "FLASH_SALE_SLOT_UPDATED" || event?.type === "ORDER_CREATED") {
        trigger({ source: "bus", payload: event.payload || null });
      }
    });

    // 3. Smart Polling fallback (5s when SSE disconnected, 15s safety sync when connected)
    const timer = window.setInterval(() => {
      if (document.visibilityState !== "visible") return;
      if (!sseConnected) {
        trigger({ source: "poll" });
      }
    }, pollIntervalMs);

    const safetyTimer = window.setInterval(() => {
      if (document.visibilityState === "visible") {
        trigger({ source: "safety_poll" });
      }
    }, Math.max(pollIntervalMs * 3, 15000));

    const handleFocusOrVisible = () => {
      if (document.visibilityState === "visible") {
        trigger({ source: "focus" });
      }
    };
    window.addEventListener("focus", handleFocusOrVisible);
    document.addEventListener("visibilitychange", handleFocusOrVisible);

    return () => {
      if (eventSource) eventSource.close();
      unsubscribeBus();
      window.clearInterval(timer);
      window.clearInterval(safetyTimer);
      window.removeEventListener("focus", handleFocusOrVisible);
      document.removeEventListener("visibilitychange", handleFocusOrVisible);
    };
  }, [enabled, pollIntervalMs]);
}
