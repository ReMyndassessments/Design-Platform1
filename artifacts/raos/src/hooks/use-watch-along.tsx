import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import { useGetCurrentUser } from "@workspace/api-client-react";

interface WatchAlongState {
  isMentor: boolean;
  isApprentice: boolean;
  caseId: string | null;
  connected: boolean;
  broadcasting: boolean;
  setBroadcasting: (on: boolean) => void;
  watcherCount: number;
  watcherNames: string[];
  following: boolean;
  followingUserName: string | null;
  stopFollowing: () => void;
}

const WatchAlongContext = createContext<WatchAlongState | null>(null);

function extractCaseId(path: string): string | null {
  const m = path.match(/^\/cases\/([^/]+)/);
  return m ? m[1] : null;
}

function wsUrl(caseId: string, token: string): string {
  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  return `${protocol}//${window.location.host}/api/ws/watch-along?token=${encodeURIComponent(token)}&caseId=${encodeURIComponent(caseId)}`;
}

export function WatchAlongProvider({ children }: { children: React.ReactNode }) {
  const { data: currentUser } = useGetCurrentUser({ query: { retry: false, staleTime: 5 * 60 * 1000 } });
  const [location, navigate] = useLocation();
  const caseId = extractCaseId(location);
  const isApprentice = currentUser?.role === "clinical_apprentice";
  const isMentor = !!currentUser && !isApprentice;

  const [broadcasting, setBroadcasting] = useState(false);
  const [connected, setConnected] = useState(false);
  const [watcherNames, setWatcherNames] = useState<string[]>([]);
  const [following, setFollowing] = useState(false);
  const [followingUserName, setFollowingUserName] = useState<string | null>(null);
  const [optedOut, setOptedOut] = useState(false);
  const optedOutRef = useRef(false);
  optedOutRef.current = optedOut;

  const wsRef = useRef<WebSocket | null>(null);
  const locationRef = useRef(location);
  locationRef.current = location;

  // Apprentices always auto-connect (passive listener) while viewing any page
  // within an assigned case. Mentors only connect while "broadcasting" is on.
  const shouldConnect = !!caseId && ((isApprentice) || (isMentor && broadcasting));

  useEffect(() => {
    if (!shouldConnect || !caseId) {
      wsRef.current?.close();
      wsRef.current = null;
      setConnected(false);
      setWatcherNames([]);
      return;
    }

    const token = localStorage.getItem("raos_token");
    if (!token) return;

    let cancelled = false;
    const ws = new WebSocket(wsUrl(caseId, token));
    wsRef.current = ws;
    setOptedOut(false);
    ws.onopen = () => {
      if (!cancelled) setConnected(true);
    };
    ws.onclose = () => {
      if (!cancelled) {
        setConnected(false);
        setWatcherNames([]);
      }
    };
    ws.onerror = () => {
      if (!cancelled) setConnected(false);
    };
    ws.onmessage = (event) => {
      if (cancelled) return;
      let msg: any;
      try {
        msg = JSON.parse(event.data);
      } catch {
        return;
      }
      if (msg?.type === "presence" && Array.isArray(msg.watchers)) {
        setWatcherNames(msg.watchers.map((w: any) => w.userName));
      } else if (msg?.type === "nav" && typeof msg.path === "string" && isApprentice) {
        setFollowingUserName(msg.fromUserName ?? null);
        if (!optedOutRef.current) {
          setFollowing(true);
          if (msg.path !== locationRef.current) {
            navigate(msg.path);
          }
        }
      }
    };

    return () => {
      cancelled = true;
      ws.close();
      wsRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shouldConnect, caseId, isApprentice]);

  // Mentor: broadcast every location change within the current case while
  // "broadcasting" is enabled.
  useEffect(() => {
    if (!isMentor || !broadcasting) return;
    const ws = wsRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN) return;
    ws.send(JSON.stringify({ type: "nav", path: location }));
  }, [location, isMentor, broadcasting]);

  // Reset broadcasting when leaving the case entirely.
  useEffect(() => {
    if (!caseId) setBroadcasting(false);
  }, [caseId]);

  const stopFollowing = useCallback(() => {
    setFollowing(false);
    setOptedOut(true);
  }, []);

  const value: WatchAlongState = {
    isMentor,
    isApprentice: !!isApprentice,
    caseId,
    connected,
    broadcasting,
    setBroadcasting,
    watcherCount: watcherNames.length,
    watcherNames,
    following: following && !optedOut,
    followingUserName,
    stopFollowing,
  };

  return <WatchAlongContext.Provider value={value}>{children}</WatchAlongContext.Provider>;
}

export function useWatchAlong(): WatchAlongState {
  const ctx = useContext(WatchAlongContext);
  if (!ctx) {
    throw new Error("useWatchAlong must be used within a WatchAlongProvider");
  }
  return ctx;
}
