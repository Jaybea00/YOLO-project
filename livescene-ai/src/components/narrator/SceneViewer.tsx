import React, { useRef, useCallback, useEffect, useState } from "react";
import Webcam from "react-webcam";
import { motion } from "framer-motion";
import { Camera, AlertCircle } from "lucide-react";
import { DetectedObject } from "../../types";
import type { StreamVideoClient, Call } from "@stream-io/video-react-sdk";

interface SceneViewerProps {
  objects?: DetectedObject[];
  isRunning?: boolean;
  onFrame?: (dataUrl: string) => void;
  error?: string | null;
  showHeatmap?: boolean;
  /** When true, use Stream Video instead of react-webcam */
  useStream?: boolean;
  /** Stream client instance (required when useStream=true) */
  streamClient?: StreamVideoClient | null;
  /** Stream call instance (required when useStream=true) */
  streamCall?: Call | null;
  /** Frame capture function from useStreamVideo hook */
  streamCaptureFrame?: () => string | null;
  /** Whether Stream is still connecting */
  streamConnecting?: boolean;
}

// ── Per-class neon colour palette ─────────────────────────────────────────────
const CLASS_COLORS: Record<string, string> = {
  person: "#6C63FF",
  car: "#00F5FF",
  "cell phone": "#32D74B",
  laptop: "#FF9F0A",
  keyboard: "#FF9F0A",
  mouse: "#FF9F0A",
  chair: "#BF5AF2",
  couch: "#BF5AF2",
  dog: "#FF6B9D",
  cat: "#FFD60A",
  bottle: "#00C7BE",
  cup: "#00C7BE",
  bowl: "#00C7BE",
  book: "#30D158",
  tv: "#FF453A",
  remote: "#C084FC",
  clock: "#67E8F9",
  backpack: "#F472B6",
  handbag: "#F472B6",
  umbrella: "#818CF8",
  suitcase: "#A78BFA",
  "sports ball": "#FACC15",
  "wine glass": "#FB923C",
  fork: "#94A3B8",
  knife: "#94A3B8",
  spoon: "#94A3B8",
  banana: "#FDE68A",
  apple: "#86EFAC",
  "potted plant": "#4ADE80",
  bed: "#C4B5FD",
  "dining table": "#FCA5A5",
  microwave: "#7DD3FC",
  oven: "#FCD34D",
  vase: "#A5B4FC",
  scissors: "#F9A8D4",
  "teddy bear": "#FDE047",
  toothbrush: "#BAE6FD",
  default: "#8E8EA0",
};

function getColor(label: string) {
  return CLASS_COLORS[label.toLowerCase()] ?? CLASS_COLORS.default;
}

const CAPTURE_INTERVAL_MS = 500; // fast: capture every 500ms

// Heatmap grid resolution
const HM_COLS = 64;
const HM_ROWS = 36;

const SceneViewer: React.FC<SceneViewerProps> = ({
  objects = [],
  isRunning = false,
  onFrame,
  error,
  showHeatmap = false,
  useStream = false,
  streamClient = null,
  streamCall = null,
  streamCaptureFrame,
  streamConnecting = false,
}) => {
  // ── Webcam mode refs ───────────────────────────────────────────────────────
  const webcamRef = useRef<Webcam>(null);
  // ── Stream mode video ref (forwarded from StreamCamera) ───────────────────
  const streamVideoRef = useRef<HTMLVideoElement>(null);

  // Unified helper: get the active <video> element regardless of mode
  const getVideoEl = useCallback((): HTMLVideoElement | null => {
    if (useStream) return streamVideoRef.current;
    return webcamRef.current?.video ?? null;
  }, [useStream]);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const heatmapCanvasRef = useRef<HTMLCanvasElement>(null);
  // Accumulation grid for heatmap (HM_COLS × HM_ROWS)
  const heatGridRef = useRef<Float32Array>(new Float32Array(HM_COLS * HM_ROWS));
  const captureTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [camReady, setCamReady] = useState(false);

  // ── Draw bounding boxes ────────────────────────────────────────────────────
  const drawOverlay = useCallback(() => {
    const canvas = canvasRef.current;
    const video = getVideoEl();
    if (!canvas || !video) return;

    const { videoWidth: w, videoHeight: h } = video;
    if (w === 0 || h === 0) return;

    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, w, h);

    objects.forEach((obj) => {
      const { x, y, width, height } = obj.bbox;
      const px = x * w;
      const py = y * h;
      const pw = width * w;
      const ph = height * h;
      const color = getColor(obj.label);

      // ── Glow + box ──────────────────────────────────────────────────────
      ctx.save();
      ctx.shadowColor = color;
      ctx.shadowBlur = 14;
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.strokeRect(px, py, pw, ph);
      ctx.restore();

      // ── Corner accent brackets ──────────────────────────────────────────
      const cs = Math.min(16, pw * 0.25, ph * 0.25); // corner size
      ctx.save();
      ctx.strokeStyle = color;
      ctx.lineWidth = 3;
      ctx.shadowColor = color;
      ctx.shadowBlur = 10;
      ctx.lineCap = "round";
      // top-left
      ctx.beginPath();
      ctx.moveTo(px, py + cs);
      ctx.lineTo(px, py);
      ctx.lineTo(px + cs, py);
      ctx.stroke();
      // top-right
      ctx.beginPath();
      ctx.moveTo(px + pw - cs, py);
      ctx.lineTo(px + pw, py);
      ctx.lineTo(px + pw, py + cs);
      ctx.stroke();
      // bottom-left
      ctx.beginPath();
      ctx.moveTo(px, py + ph - cs);
      ctx.lineTo(px, py + ph);
      ctx.lineTo(px + cs, py + ph);
      ctx.stroke();
      // bottom-right
      ctx.beginPath();
      ctx.moveTo(px + pw - cs, py + ph);
      ctx.lineTo(px + pw, py + ph);
      ctx.lineTo(px + pw, py + ph - cs);
      ctx.stroke();
      ctx.restore();

      // ── Label + confidence pill ─────────────────────────────────────────
      const confPct = `${Math.round(obj.confidence * 100)}%`;
      const labelText = obj.label;
      ctx.font = 'bold 11px "JetBrains Mono", monospace';
      const labelW = ctx.measureText(labelText).width;
      const confW = ctx.measureText(confPct).width;
      const PAD = 7;
      const pillH = 20;
      const pillX = px;
      const pillY = py > pillH + 4 ? py - pillH - 4 : py + 4;
      const labelSectionW = labelW + PAD * 2;
      const confSectionW = confW + PAD * 2;

      // label section (solid colour)
      ctx.save();
      ctx.fillStyle = color + "EE";
      ctx.beginPath();
      ctx.roundRect(pillX, pillY, labelSectionW + confSectionW, pillH, 5);
      ctx.fill();
      ctx.restore();

      // conf section overlay (darker tint)
      ctx.save();
      ctx.fillStyle = "rgba(0,0,0,0.35)";
      ctx.beginPath();
      ctx.roundRect(
        pillX + labelSectionW,
        pillY,
        confSectionW,
        pillH,
        [0, 5, 5, 0],
      );
      ctx.fill();
      ctx.restore();

      // divider line
      ctx.save();
      ctx.strokeStyle = "rgba(0,0,0,0.25)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(pillX + labelSectionW, pillY + 3);
      ctx.lineTo(pillX + labelSectionW, pillY + pillH - 3);
      ctx.stroke();
      ctx.restore();

      // label text
      ctx.save();
      ctx.fillStyle = "#ffffff";
      ctx.font = 'bold 11px "JetBrains Mono", monospace';
      ctx.fillText(labelText, pillX + PAD, pillY + 14);
      ctx.restore();

      // conf text
      ctx.save();
      ctx.fillStyle = "rgba(255,255,255,0.85)";
      ctx.font = '10px "JetBrains Mono", monospace';
      ctx.fillText(confPct, pillX + labelSectionW + PAD, pillY + 14);
      ctx.restore();
    });
  }, [objects]);

  // ── Heatmap accumulation ───────────────────────────────────────────────────
  useEffect(() => {
    const grid = heatGridRef.current;
    // Decay existing values
    for (let i = 0; i < grid.length; i++) grid[i] *= 0.97;
    // Accumulate bbox centres
    objects.forEach(({ bbox }) => {
      const cx = Math.floor((bbox.x + bbox.width / 2) * HM_COLS);
      const cy = Math.floor((bbox.y + bbox.height / 2) * HM_ROWS);
      const r = Math.max(
        1,
        Math.floor(Math.min(bbox.width * HM_COLS, bbox.height * HM_ROWS) / 4),
      );
      for (let dy = -r; dy <= r; dy++) {
        for (let dx = -r; dx <= r; dx++) {
          const nx = cx + dx;
          const ny = cy + dy;
          if (nx >= 0 && nx < HM_COLS && ny >= 0 && ny < HM_ROWS) {
            const dist = Math.sqrt(dx * dx + dy * dy) / r;
            grid[ny * HM_COLS + nx] = Math.min(
              1,
              grid[ny * HM_COLS + nx] + (1 - dist) * 0.15,
            );
          }
        }
      }
    });
  }, [objects]);

  // ── Heatmap render ─────────────────────────────────────────────────────────
  const drawHeatmap = useCallback(() => {
    const hc = heatmapCanvasRef.current;
    if (!hc || !showHeatmap) return;
    const video = getVideoEl();
    if (!video) return;
    const { videoWidth: vw, videoHeight: vh } = video;
    if (!vw || !vh) return;
    if (hc.width !== vw) hc.width = vw;
    if (hc.height !== vh) hc.height = vh;
    const ctx = hc.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, vw, vh);
    const grid = heatGridRef.current;
    const cw = vw / HM_COLS;
    const ch = vh / HM_ROWS;
    for (let y = 0; y < HM_ROWS; y++) {
      for (let x = 0; x < HM_COLS; x++) {
        const v = grid[y * HM_COLS + x];
        if (v < 0.02) continue;
        const t = Math.min(1, v);
        // colour ramp: blue → cyan → green → yellow → red
        const rr = t < 0.5 ? 0 : Math.round((t - 0.5) * 2 * 255);
        const gg =
          t < 0.25 ? 0 : t < 0.75 ? Math.round((t - 0.25) * 2 * 255) : 255;
        const bb = Math.max(0, Math.round((1 - t * 1.5) * 255));
        ctx.fillStyle = `rgba(${rr},${gg},${bb},${Math.min(0.75, v * 1.5)})`;
        ctx.fillRect(x * cw, y * ch, cw + 1, ch + 1);
      }
    }
  }, [showHeatmap]);

  // ── Redraw loop ────────────────────────────────────────────────────────────
  useEffect(() => {
    let frameId: number;
    const loop = () => {
      drawOverlay();
      drawHeatmap();
      frameId = requestAnimationFrame(loop);
    };
    frameId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frameId);
  }, [drawOverlay, drawHeatmap]);

  // ── Frame capture interval ─────────────────────────────────────────────────
  // In Stream mode, camReady is controlled by StreamCamera's onReady callback
  const [streamReady, setStreamReady] = useState(false);
  const activeReady = useStream ? streamReady : camReady;

  useEffect(() => {
    if (captureTimerRef.current) {
      clearInterval(captureTimerRef.current);
      captureTimerRef.current = null;
    }

    const getFrame = useStream
      ? () => streamCaptureFrame?.() ?? null
      : () => webcamRef.current?.getScreenshot() ?? null;

    if (isRunning && onFrame && activeReady) {
      // Fire immediately on start
      const snap = getFrame();
      if (snap) onFrame(snap);

      captureTimerRef.current = setInterval(() => {
        const dataUrl = getFrame();
        if (dataUrl) onFrame(dataUrl);
      }, CAPTURE_INTERVAL_MS);
    }

    return () => {
      if (captureTimerRef.current) {
        clearInterval(captureTimerRef.current);
        captureTimerRef.current = null;
      }
    };
  }, [isRunning, onFrame, activeReady, useStream, streamCaptureFrame]);

  // Lazy-load StreamCamera only when needed (avoids importing SDK CSS globally)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [StreamCameraComponent, setStreamCameraComponent] =
    useState<React.ComponentType<any> | null>(null);

  useEffect(() => {
    if (useStream && !StreamCameraComponent) {
      import("./StreamCamera").then((m) =>
        setStreamCameraComponent(() => m.default),
      );
    }
  }, [useStream]); // eslint-disable-line

  return (
    <div className="relative w-full aspect-video rounded-2xl overflow-hidden bg-dark-800 border border-white/8">
      {/* ── Camera feed — Webcam or Stream ─────────────────────────────── */}
      {useStream && StreamCameraComponent && streamClient && streamCall ? (
        <StreamCameraComponent
          client={streamClient}
          call={streamCall}
          videoRef={streamVideoRef}
          isConnecting={streamConnecting}
          onReady={() => setStreamReady(true)}
        />
      ) : (
        <Webcam
          ref={webcamRef}
          audio={false}
          screenshotFormat="image/jpeg"
          screenshotQuality={0.7}
          videoConstraints={{ facingMode: "user", width: 1280, height: 720 }}
          className="absolute inset-0 w-full h-full object-cover"
          onUserMedia={() => setCamReady(true)}
          onUserMediaError={() => setCamReady(false)}
        />
      )}

      {/* Canvas overlay for bounding boxes */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full pointer-events-none"
      />

      {/* Heatmap overlay */}
      <canvas
        ref={heatmapCanvasRef}
        className="absolute inset-0 w-full h-full pointer-events-none transition-opacity duration-300"
        style={{ opacity: showHeatmap ? 0.7 : 0 }}
      />

      {/* Scan line effect when running */}
      {isRunning && (
        <div className="absolute inset-x-0 h-px bg-gradient-to-r from-transparent via-brand to-transparent opacity-70 animate-scan-line pointer-events-none" />
      )}

      {/* Corner brackets (UI chrome) */}
      <div className="absolute top-3 left-3 w-6 h-6 border-t-2 border-l-2 border-brand/60 rounded-tl" />
      <div className="absolute top-3 right-3 w-6 h-6 border-t-2 border-r-2 border-brand/60 rounded-tr" />
      <div className="absolute bottom-3 left-3 w-6 h-6 border-b-2 border-l-2 border-brand/60 rounded-bl" />
      <div className="absolute bottom-3 right-3 w-6 h-6 border-b-2 border-r-2 border-brand/60 rounded-br" />

      {/* Object count badge */}
      {objects.length > 0 && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="absolute top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-dark-700/80 backdrop-blur-sm border border-white/10 text-xs font-mono text-white/70"
        >
          {objects.length} object{objects.length !== 1 ? "s" : ""} detected
        </motion.div>
      )}

      {/* Live indicator */}
      {isRunning && (
        <div className="absolute bottom-3 left-3 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-neon-green/15 border border-neon-green/30">
          <span className="w-1.5 h-1.5 rounded-full bg-neon-green animate-pulse" />
          <span className="text-neon-green text-xs font-mono font-semibold">
            LIVE
          </span>
        </div>
      )}

      {/* Object label pills — bottom right */}
      {objects.length > 0 && (
        <div className="absolute bottom-3 right-3 flex flex-wrap justify-end gap-1 max-w-[60%]">
          {objects.map((obj) => (
            <span
              key={obj.id}
              className="px-2 py-0.5 rounded-full text-xs font-mono bg-dark-900/80 backdrop-blur-sm border"
              style={{
                borderColor: getColor(obj.label) + "66",
                color: getColor(obj.label),
              }}
            >
              {obj.label}
            </span>
          ))}
        </div>
      )}

      {/* Error overlay */}
      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-dark-900/60 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-2 text-center px-4">
            <AlertCircle className="text-neon-red" size={32} />
            <p className="text-white/70 text-sm">{error}</p>
          </div>
        </div>
      )}

      {/* Placeholder when not running */}
      {!isRunning && objects.length === 0 && !error && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-dark-900/70">
          <Camera size={40} className="text-white/20 mb-3" />
          <p className="text-white/30 text-sm">
            Start analysis to begin monitoring
          </p>
        </div>
      )}
    </div>
  );
};

export default SceneViewer;
