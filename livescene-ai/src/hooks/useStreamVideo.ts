/**
 * useStreamVideo.ts
 *
 * Initialises the Stream Video client, creates (or joins) a call,
 * and exposes a `captureFrame()` helper so SceneViewer can snapshot
 * the live video feed for YOLO analysis — exactly like react-webcam's
 * getScreenshot().
 *
 * Usage:
 *   const { client, call, videoRef, captureFrame, isConnecting, streamError } = useStreamVideo({ enabled });
 */

import { useEffect, useRef, useState, useCallback } from "react";
import { StreamVideoClient, Call } from "@stream-io/video-react-sdk";

const API_BASE = import.meta.env.VITE_API_URL ?? "http://localhost:5000";
const CALL_TYPE = "default";
const CALL_ID = "livescene-room"; // fixed room; change to make multi-room

interface UseStreamVideoOptions {
  enabled: boolean;
}

interface UseStreamVideoResult {
  client: StreamVideoClient | null;
  call: Call | null;
  videoRef: React.RefObject<HTMLVideoElement>;
  captureFrame: () => string | null; // returns JPEG data-URL or null
  isConnecting: boolean;
  streamError: string | null;
}

export function useStreamVideo({
  enabled,
}: UseStreamVideoOptions): UseStreamVideoResult {
  const [client, setClient] = useState<StreamVideoClient | null>(null);
  const [call, setCall] = useState<Call | null>(null);
  const [isConnecting, setConnecting] = useState(false);
  const [streamError, setStreamError] = useState<string | null>(null);

  // Ref to the <video> element that StreamCamera will attach
  const videoRef = useRef<HTMLVideoElement>(null);

  // Canvas used for frame capture (off-screen)
  const captureCanvas = useRef<HTMLCanvasElement | null>(null);
  if (!captureCanvas.current) {
    captureCanvas.current = document.createElement("canvas");
  }

  // ── Connect ────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!enabled) return;

    let _client: StreamVideoClient | null = null;
    let _call: Call | null = null;
    let cancelled = false;

    (async () => {
      setConnecting(true);
      setStreamError(null);

      try {
        // 1. Get token from backend
        const res = await fetch(`${API_BASE}/api/stream/token`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({}),
        });

        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.detail ?? `Token request failed (${res.status})`);
        }

        const { apiKey, userId, token } = await res.json();
        if (cancelled) return;

        // 2. Create client
        _client = new StreamVideoClient({
          apiKey,
          user: { id: userId, name: "LiveScene Viewer" },
          token,
        });

        // 3. Get or create call
        _call = _client.call(CALL_TYPE, CALL_ID);
        await _call.getOrCreate();

        // 4. Join — camera on, mic off
        await _call.join({ create: true });
        await _call.camera.enable();

        if (cancelled) {
          await _call.leave();
          await _client.disconnectUser();
          return;
        }

        setClient(_client);
        setCall(_call);
      } catch (e: unknown) {
        if (!cancelled) {
          const msg = e instanceof Error ? e.message : String(e);
          setStreamError(msg);
        }
      } finally {
        if (!cancelled) setConnecting(false);
      }
    })();

    return () => {
      cancelled = true;
      _call?.leave().catch(() => {});
      _client?.disconnectUser().catch(() => {});
      setClient(null);
      setCall(null);
      setConnecting(false);
    };
  }, [enabled]);

  // ── Frame capture ──────────────────────────────────────────────────────────
  const captureFrame = useCallback((): string | null => {
    const video = videoRef.current;
    const canvas = captureCanvas.current;
    if (!video || !canvas || !video.videoWidth) return null;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.drawImage(video, 0, 0);
    return canvas.toDataURL("image/jpeg", 0.85);
  }, []);

  return { client, call, videoRef, captureFrame, isConnecting, streamError };
}
