import { useCallback, useEffect, useRef, useState } from "react";
import {
  DetectedObject,
  SceneState,
  StatsData,
  SessionRecord,
  WsDetectionPayload,
  WsNarrationPayload,
  WsStatusPayload,
  WsInboundMessage,
} from "../types";
import { generateUniqueId } from "../utils/helpers";
import theme from "../styles/theme";

// ─── Config ──────────────────────────────────────────────────────────────────
const WS_URL = import.meta.env.VITE_WS_URL || "ws://localhost:5000/ws/stream";
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";
// Set VITE_MOCK_BACKEND=false in .env when Python backend is running
const MOCK_BACKEND = import.meta.env.VITE_MOCK_BACKEND !== "false";
const MOCK_INTERVAL = 2500;
const FRAME_INTERVAL = 500; // send frame to WS every 500ms for fast detection
const PING_INTERVAL = 20_000;

// ─── Mock YOLO detection generator ──────────────────────────────────────────
function mockDetect(): DetectedObject[] {
  const pool = [
    "person",
    "phone",
    "laptop",
    "chair",
    "cup",
    "bottle",
    "book",
    "dog",
    "cat",
    "car",
  ];
  const count = Math.floor(Math.random() * 4);
  return pool
    .sort(() => 0.5 - Math.random())
    .slice(0, count)
    .map((label) => ({
      id: generateUniqueId(),
      label,
      confidence: 0.7 + Math.random() * 0.29,
      bbox: {
        x: Math.random() * 0.7,
        y: Math.random() * 0.7,
        width: 0.1 + Math.random() * 0.2,
        height: 0.1 + Math.random() * 0.2,
      },
      color: theme.objectColors[label] || theme.objectColors.default,
    }));
}

function colourize(raw: DetectedObject[]): DetectedObject[] {
  return raw.map((o) => ({
    ...o,
    color: theme.objectColors[o.label] || theme.objectColors.default,
  }));
}

// ─── Hook ────────────────────────────────────────────────────────────────────
export function useSceneAnalysis() {
  const [sceneState, setSceneState] = useState<SceneState>({
    objects: [],
    objectCount: 0,
    labels: [],
    timestamp: 0,
  });
  const [isRunning, setIsRunning] = useState(false);
  const [isConnected, setIsConnected] = useState(MOCK_BACKEND);
  const [error, setError] = useState<string | null>(null);
  const [backendInfo, setBackendInfo] = useState({
    llmReady: false,
    llmProvider: "heuristic",
    yoloReady: false,
  });
  const [stats, setStats] = useState<StatsData>({
    sessionDuration: 0,
    totalDetections: 0,
    uniqueObjects: 0,
    narrationCount: 0,
    activityCount: 0,
    fps: 0,
    isLive: false,
  });
  const [sessionHistory] = useState<SessionRecord[]>([]);
  const [labelCounts, setLabelCounts] = useState<Record<string, number>>({});
  const [fpsHistory, setFpsHistory] = useState<number[]>([]);

  const [conf, setConfState] = useState<number>(0.2);
  const confRef = useRef<number>(0.2);

  const setConf = useCallback((v: number) => {
    const clamped = Math.round(Math.min(0.8, Math.max(0.05, v)) * 100) / 100;
    confRef.current = clamped;
    setConfState(clamped);
  }, []);

  const wsRef = useRef<WebSocket | null>(null);
  const mockIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const frameIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const fpsIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const sessionStartRef = useRef<number>(0);
  const totalDetectRef = useRef(0);
  const uniqueLabelsRef = useRef<Set<string>>(new Set());
  const frameCountRef = useRef(0);
  // Rolling window of the last 10 frame-sent timestamps for smooth FPS
  const frameTsRef = useRef<number[]>([]);
  const lastFrameRef = useRef<string>("");
  const sessionIdRef = useRef<string>(`session-${Date.now()}`);
  const isRunningRef = useRef(false);

  const onDetectionRef = useRef<((objects: DetectedObject[]) => void) | null>(
    null,
  );
  const onNarrationRef = useRef<((payload: WsNarrationPayload) => void) | null>(
    null,
  );

  // ── Rolling FPS from sent frames (fires even on empty scenes) ────────────
  const recordFrameSent = useCallback(() => {
    const now = Date.now();
    frameTsRef.current.push(now);
    if (frameTsRef.current.length > 10) frameTsRef.current.shift();
    const arr = frameTsRef.current;
    if (arr.length >= 2) {
      const windowMs = arr[arr.length - 1] - arr[0];
      const fps = Math.round(((arr.length - 1) / windowMs) * 1000);
      setStats((prev) => ({ ...prev, fps }));
      setFpsHistory((prev) => {
        const next = [...prev, fps];
        return next.length > 60 ? next.slice(-60) : next;
      });
    }
  }, []);

  // ── Public API ────────────────────────────────────────────────────────────
  const onFrame = useCallback((cb: (objects: DetectedObject[]) => void) => {
    onDetectionRef.current = cb;
  }, []);

  const setFrame = useCallback((dataUrl: string) => {
    lastFrameRef.current = dataUrl;
  }, []);

  const onNarration = useCallback((cb: (p: WsNarrationPayload) => void) => {
    onNarrationRef.current = cb;
  }, []);

  // ── Object handler ────────────────────────────────────────────────────────
  const handleObjects = useCallback((objects: DetectedObject[]) => {
    totalDetectRef.current += objects.length;
    objects.forEach((o) => uniqueLabelsRef.current.add(o.label));
    frameCountRef.current += 1;

    const state: SceneState = {
      objects,
      objectCount: objects.length,
      labels: objects.map((o) => o.label),
      timestamp: Date.now(),
      frameDataUrl: lastFrameRef.current || undefined,
    };
    setSceneState(state);
    setStats((prev) => ({
      ...prev,
      totalDetections: totalDetectRef.current,
      uniqueObjects: uniqueLabelsRef.current.size,
      sessionDuration: Date.now() - sessionStartRef.current,
      isLive: true,
    }));
    onDetectionRef.current?.(objects);
  }, []);

  // ── Mock mode ─────────────────────────────────────────────────────────────
  const startMock = useCallback(() => {
    mockIntervalRef.current = setInterval(() => {
      if (!isRunningRef.current) return;
      recordFrameSent();
      handleObjects(mockDetect());
    }, MOCK_INTERVAL);
  }, [handleObjects, recordFrameSent]);

  // ── WebSocket mode ────────────────────────────────────────────────────────
  const startWebSocket = useCallback(() => {
    fetch(`${API_URL}/api/status`, { signal: AbortSignal.timeout(3000) })
      .then((r) => r.json())
      .then((s) =>
        setBackendInfo({
          yoloReady: s.yoloReady,
          llmReady: s.llmReady,
          llmProvider: s.llmProvider || "heuristic",
        }),
      )
      .catch(() => {
        /* non-fatal */
      });

    const ws = new WebSocket(WS_URL);
    wsRef.current = ws;

    ws.onopen = () => {
      setIsConnected(true);
      setError(null);

      frameIntervalRef.current = setInterval(() => {
        if (!isRunningRef.current || ws.readyState !== WebSocket.OPEN) return;
        const frame = lastFrameRef.current;
        if (!frame) return;
        recordFrameSent();
        ws.send(
          JSON.stringify({
            type: "frame",
            frame,
            sessionId: sessionIdRef.current,
            includeLLM: true,
            conf: confRef.current,
            timestamp: Date.now(),
          }),
        );
      }, FRAME_INTERVAL);

      pingIntervalRef.current = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN)
          ws.send(JSON.stringify({ type: "ping" }));
      }, PING_INTERVAL);
    };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data as string) as WsInboundMessage;
        if (msg.type === "detection") {
          const det = msg as WsDetectionPayload;
          handleObjects(colourize(det.objects));
          if (det.labelCounts) {
            setLabelCounts(det.labelCounts);
          }
        } else if (msg.type === "narration") {
          onNarrationRef.current?.(msg as WsNarrationPayload);
          setStats((prev) => ({
            ...prev,
            narrationCount: prev.narrationCount + 1,
          }));
        } else if (msg.type === "status") {
          const s = msg as WsStatusPayload;
          setBackendInfo({
            yoloReady: s.yoloReady,
            llmReady: s.llmReady,
            llmProvider: s.llmProvider,
          });
        } else if (msg.type === "error") {
          setError((msg as { type: "error"; message: string }).message);
        }
      } catch {
        /* malformed */
      }
    };

    ws.onerror = () => {
      setIsConnected(false);
      setError("WebSocket error — is the Python backend running?");
    };

    ws.onclose = () => {
      setIsConnected(false);
      if (frameIntervalRef.current) clearInterval(frameIntervalRef.current);
      if (pingIntervalRef.current) clearInterval(pingIntervalRef.current);
    };
  }, [handleObjects, recordFrameSent]);

  // ── Start / Stop ──────────────────────────────────────────────────────────
  const startAnalysis = useCallback(() => {
    if (isRunningRef.current) return;
    isRunningRef.current = true;
    setIsRunning(true);
    sessionStartRef.current = Date.now();
    totalDetectRef.current = 0;
    uniqueLabelsRef.current = new Set();
    frameCountRef.current = 0;
    frameTsRef.current = [];
    sessionIdRef.current = `session-${Date.now()}`;
    setLabelCounts({});
    setFpsHistory([]);

    // Keep session duration ticking every second
    fpsIntervalRef.current = setInterval(() => {
      if (!isRunningRef.current) return;
      setStats((prev) => ({
        ...prev,
        sessionDuration: Date.now() - sessionStartRef.current,
      }));
    }, 1000);

    if (MOCK_BACKEND) {
      startMock();
    } else {
      startWebSocket();
    }
  }, [startMock, startWebSocket]);

  const stopAnalysis = useCallback(() => {
    if (!isRunningRef.current) return;
    isRunningRef.current = false;
    setIsRunning(false);
    frameTsRef.current = [];
    setStats((prev) => ({ ...prev, isLive: false, fps: 0 }));
    [
      mockIntervalRef,
      frameIntervalRef,
      pingIntervalRef,
      fpsIntervalRef,
    ].forEach((r) => {
      if (r.current) clearInterval(r.current);
    });
    if (wsRef.current?.readyState === WebSocket.OPEN) wsRef.current.close();
    wsRef.current = null;
  }, []);

  const incrementNarrationCount = useCallback(() => {
    setStats((prev) => ({ ...prev, narrationCount: prev.narrationCount + 1 }));
  }, []);

  const incrementActivityCount = useCallback(() => {
    setStats((prev) => ({ ...prev, activityCount: prev.activityCount + 1 }));
  }, []);

  useEffect(() => {
    return () => {
      isRunningRef.current = false;
      [
        mockIntervalRef,
        frameIntervalRef,
        pingIntervalRef,
        fpsIntervalRef,
      ].forEach((r) => {
        if (r.current) clearInterval(r.current);
      });
      wsRef.current?.close();
    };
  }, []);

  return {
    sceneState,
    isRunning,
    isConnected,
    error,
    backendInfo,
    stats,
    sessionHistory,
    labelCounts,
    fpsHistory,
    conf,
    setConf,
    isMockMode: MOCK_BACKEND,
    startAnalysis,
    stopAnalysis,
    onFrame,
    onNarration,
    setFrame,
    incrementNarrationCount,
    incrementActivityCount,
  };
}

export default useSceneAnalysis;
