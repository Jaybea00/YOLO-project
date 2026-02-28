import React, { useEffect, useCallback, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Play,
  Square,
  RotateCcw,
  Volume2,
  VolumeX,
  Camera,
  SlidersHorizontal,
  X,
  HelpCircle,
  Share2,
  Flame,
  Wifi,
  Zap,
} from "lucide-react";
import SceneViewer from "../components/narrator/SceneViewer";
import NarratorPanel from "../components/narrator/NarratorPanel";
import ActivityFeed from "../components/narrator/ActivityFeed";
import DwellPanel from "../components/narrator/DwellPanel";
import AlertPanel from "../components/narrator/AlertPanel";
import AlertBanner from "../components/narrator/AlertBanner";
import PresetBar, { Preset } from "../components/narrator/PresetBar";
import MicBar from "../components/narrator/MicBar";
import Dashboard from "../components/dashboard/Dashboard";
import Button from "../components/common/Button";
import HelpModal from "../components/common/HelpModal";
import { useSceneAnalysisContext } from "../context/SceneAnalysisContext";
import { useNarrator } from "../hooks/useNarrator";
import { useAlert } from "../hooks/useAlert";
import { useVoiceInput } from "../hooks/useVoiceInput";
import { useKeyboardShortcuts } from "../hooks/useKeyboardShortcuts";
import { useSoundAlert } from "../hooks/useSoundAlert";
import { useStreamVideo } from "../hooks/useStreamVideo";
import { saveSession } from "../services/sceneService";
import DemoWalkthrough from "../components/common/DemoWalkthrough";

const Analyze: React.FC = () => {
  const sessionStartRef = useRef<number>(Date.now());

  // ── Snapshots (up to 6) ──────────────────────────────────────────────────
  const [snapshots, setSnapshots] = useState<string[]>([]);

  // ── Help modal ────────────────────────────────────────────────────────────
  const [showHelp, setShowHelp] = useState(false);

  // ── Demo walkthrough ──────────────────────────────────────────────────────
  const [showTour, setShowTour] = useState(false);

  // ── Object class filter ──────────────────────────────────────────────────
  const [mutedLabels, setMutedLabels] = useState<Set<string>>(new Set());
  const [showFilters, setShowFilters] = useState(false);
  const [showHeatmap, setShowHeatmap] = useState(false);

  // ── Stream Video integration ──────────────────────────────────────────────
  const [useStream, setUseStream] = useState(false);
  const {
    client: streamClient,
    call: streamCall,
    captureFrame: streamCaptureFrame,
    isConnecting: streamConnecting,
    streamError: streamError,
  } = useStreamVideo({ enabled: useStream });

  // ── Active demo preset ────────────────────────────────────────────────────
  const [activePresetId, setActivePresetId] = useState<string | null>(null);
  const toggleMuted = useCallback((label: string) => {
    setMutedLabels((prev) => {
      const next = new Set(prev);
      next.has(label) ? next.delete(label) : next.add(label);
      return next;
    });
  }, []);

  const {
    sceneState,
    isRunning,
    isConnected,
    error,
    stats,
    backendInfo,
    conf,
    setConf,
    isMockMode,
    labelCounts,
    fpsHistory,
    startAnalysis,
    stopAnalysis,
    onFrame,
    onNarration,
    setFrame,
    incrementNarrationCount,
    incrementActivityCount,
  } = useSceneAnalysisContext();

  const {
    narrations,
    activities,
    currentNarration,
    isActive,
    isSpeaking,
    processObjects,
    injectNarration,
    pushVoiceEntry,
    startSession,
    stopSession,
    clearHistory,
    speak,
  } = useNarrator();

  const { playAlert, playStart, playStop } = useSoundAlert();

  const {
    goals,
    alerts,
    activeAlert,
    addGoal,
    removeGoal,
    toggleGoal,
    checkGoals,
    dismissAlert,
    clearAlerts,
  } = useAlert();

  // Register frame detection callback — processes objects AND checks alert goals
  useEffect(() => {
    onFrame((objects) => {
      processObjects(objects);
      checkGoals(objects.map((o) => o.label));
    });
  }, [onFrame, processObjects, checkGoals]);

  // Register real LLM narration callback (fires when backend sends a "narration" WS msg)
  useEffect(() => {
    onNarration(injectNarration);
  }, [onNarration, injectNarration]);

  // Sync narration count
  useEffect(() => {
    if (narrations.length > 0) incrementNarrationCount();
  }, [narrations.length]); // eslint-disable-line

  // Sync activity count
  useEffect(() => {
    if (activities.length > 0) incrementActivityCount();
  }, [activities.length]); // eslint-disable-line

  // Play alert sound when a new alert fires
  useEffect(() => {
    if (activeAlert) playAlert();
  }, [activeAlert]); // eslint-disable-line

  const handleStart = useCallback(() => {
    sessionStartRef.current = Date.now();
    startAnalysis();
    startSession();
    playStart();
  }, [startAnalysis, startSession, playStart]);

  const handleStop = useCallback(() => {
    stopAnalysis();
    stopSession();
    playStop();
    // Persist session to localStorage
    saveSession({
      startTime: sessionStartRef.current,
      endTime: Date.now(),
      narrations,
      activities,
      objects: activities
        .filter((a) => a.type === "object_appeared")
        .map((a) => a.label),
      labelCounts,
    });
  }, [
    stopAnalysis,
    stopSession,
    playStop,
    narrations,
    activities,
    labelCounts,
  ]);

  const handleReset = useCallback(() => {
    stopAnalysis();
    stopSession();
    clearHistory();
    clearAlerts();
    setSnapshots([]);
    setMutedLabels(new Set());
    setActivePresetId(null);
  }, [stopAnalysis, stopSession, clearHistory, clearAlerts]);

  // Grab the current frame from the last captured data URL
  const lastFrameRef = useRef<string>("");
  const handleSetFrame = useCallback(
    (dataUrl: string) => {
      lastFrameRef.current = dataUrl;
      setFrame(dataUrl);
    },
    [setFrame],
  );

  const takeSnapshot = useCallback(() => {
    if (!lastFrameRef.current) return;
    setSnapshots((prev) => [lastFrameRef.current, ...prev].slice(0, 6));
  }, []);

  // ── Export annotated PNG ───────────────────────────────────────────────────
  const exportAnnotatedSnapshot = useCallback(() => {
    const frame = lastFrameRef.current;
    if (!frame) return;

    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      // Draw base frame
      ctx.drawImage(img, 0, 0);

      // Draw bounding boxes for current filtered objects
      const objs = sceneObjectsRef.current;
      const w = canvas.width;
      const h = canvas.height;

      objs.forEach((obj) => {
        const { x, y, width, height } = obj.bbox;
        const px = x * w,
          py = y * h,
          pw = width * w,
          ph = height * h;
        const color = obj.color || "#6e56cf";

        ctx.save();
        ctx.shadowColor = color;
        ctx.shadowBlur = 10;
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.strokeRect(px, py, pw, ph);
        ctx.restore();

        // Label pill
        const labelText = obj.label;
        const confText = `${Math.round(obj.confidence * 100)}%`;
        ctx.font = 'bold 12px "JetBrains Mono", monospace';
        const lw = ctx.measureText(labelText).width;
        ctx.font = '10px "JetBrains Mono", monospace';
        const cw = ctx.measureText(confText).width;
        const pillH = 20,
          pad = 6;
        const pillY = py > pillH + 4 ? py - pillH - 4 : py + 4;

        ctx.save();
        ctx.fillStyle = color + "EE";
        ctx.beginPath();
        ctx.roundRect(px, pillY, lw + cw + pad * 3 + 4, pillH, 4);
        ctx.fill();
        ctx.restore();

        ctx.save();
        ctx.fillStyle = "#fff";
        ctx.font = 'bold 11px "JetBrains Mono", monospace';
        ctx.fillText(labelText, px + pad, pillY + 14);
        ctx.font = '10px "JetBrains Mono", monospace';
        ctx.fillStyle = "rgba(255,255,255,0.8)";
        ctx.fillText(confText, px + pad + lw + 4, pillY + 14);
        ctx.restore();
      });

      // Watermark: timestamp + branding
      const stamp = `LiveScene AI  •  ${new Date().toLocaleString()}`;
      ctx.save();
      ctx.font = '12px "JetBrains Mono", monospace';
      const sw = ctx.measureText(stamp).width;
      ctx.fillStyle = "rgba(0,0,0,0.55)";
      ctx.fillRect(w - sw - 18, h - 28, sw + 16, 22);
      ctx.fillStyle = "rgba(255,255,255,0.75)";
      ctx.fillText(stamp, w - sw - 10, h - 11);
      ctx.restore();

      // Trigger download
      canvas.toBlob((blob) => {
        if (!blob) return;
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `livescene-${Date.now()}.png`;
        a.click();
        URL.revokeObjectURL(url);
      }, "image/png");
    };
    img.src = frame;
  }, []);

  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const toggleVoice = useCallback(() => {
    setVoiceEnabled((prev) => {
      if (prev) window.speechSynthesis?.cancel();
      return !prev;
    });
  }, []);

  // ── API base URL for /api/ask ──────────────────────────────────────────────
  const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

  // ── Voice command handler ─────────────────────────────────────────────────
  // Keep refs to latest handlers so the useVoiceInput callback never goes stale
  const handleStartRef = useRef<() => void>(() => {});
  const handleStopRef = useRef<() => void>(() => {});
  const takeSnapshotRef = useRef<() => void>(() => {});
  const addGoalRef = useRef<(g: string) => void>(() => {});
  const clearAlertsRef = useRef<() => void>(() => {});
  const injectNarrationRef = useRef<(n: any) => void>(() => {});
  const sceneObjectsRef = useRef<import("../types").DetectedObject[]>([]);

  // Keep object refs fresh every render
  useEffect(() => {
    handleStartRef.current = handleStart;
  }, [handleStart]); // eslint-disable-line
  useEffect(() => {
    handleStopRef.current = handleStop;
  }, [handleStop]); // eslint-disable-line
  useEffect(() => {
    takeSnapshotRef.current = takeSnapshot;
  }, [takeSnapshot]);
  useEffect(() => {
    addGoalRef.current = addGoal;
  }, [addGoal]);
  useEffect(() => {
    clearAlertsRef.current = clearAlerts;
  }, [clearAlerts]);
  useEffect(() => {
    injectNarrationRef.current = injectNarration;
  }, [injectNarration]);
  useEffect(() => {
    sceneObjectsRef.current = sceneState.objects;
  }, [sceneState.objects]);

  const handleVoiceCommand = useCallback(
    async (cmd: any) => {
      switch (cmd.type) {
        case "start":
          handleStartRef.current();
          break;
        case "stop":
          handleStopRef.current();
          break;
        case "snapshot":
          takeSnapshotRef.current();
          break;
        case "reset":
          handleReset();
          break;
        case "set_goal":
          addGoalRef.current(
            cmd.text.startsWith("alert") ? cmd.text : `Alert me if ${cmd.text}`,
          );
          break;
        case "clear_goals":
          clearAlertsRef.current();
          break;
        case "mute_voice":
          setVoiceEnabled(false);
          window.speechSynthesis?.cancel();
          break;
        case "unmute_voice":
          setVoiceEnabled(true);
          break;
        case "ask": {
          // POST to /api/ask and inject the answer as a narration
          try {
            const res = await fetch(`${API_URL}/api/ask`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                question: cmd.question,
                objects: sceneObjectsRef.current,
                session_id: "default",
              }),
            });
            if (res.ok) {
              const data = await res.json();
              injectNarrationRef.current({
                type: "narration",
                narration: data.answer,
                sceneDescription: "",
                insights: [],
                provider: "gemini",
                timestamp: Date.now(),
              });
            }
          } catch (e) {
            console.warn("Voice ask failed:", e);
          }
          break;
        }
      }
    },
    [handleReset, setVoiceEnabled, API_URL],
  ); // eslint-disable-line

  const pushVoiceEntryRef = useRef<(t: string) => void>(() => {});
  useEffect(() => {
    pushVoiceEntryRef.current = pushVoiceEntry;
  }, [pushVoiceEntry]);

  const {
    isListening,
    isSupported: micSupported,
    transcript,
    micLevel,
    error: micError,
    toggleListening,
  } = useVoiceInput({
    onCommand: handleVoiceCommand,
    onTranscript: (text) => pushVoiceEntryRef.current(text),
  });

  // Apply a demo preset: load its goals then start the session
  const applyPreset = useCallback(
    (preset: Preset) => {
      // Clear existing alerts/goals first
      clearAlerts();
      setActivePresetId(preset.id);
      preset.goals.forEach((g) => addGoal(g));
      // Auto-start if not already running
      if (!isRunning) {
        sessionStartRef.current = Date.now();
        startAnalysis();
        startSession();
      }
    },
    [clearAlerts, addGoal, isRunning, startAnalysis, startSession],
  );

  // Unique labels currently visible for filter chips
  const visibleLabels = Array.from(
    new Set(sceneState.objects.map((o) => o.label)),
  ).sort();

  // ── Keyboard shortcuts ────────────────────────────────────────────────────
  const SHORTCUTS = [
    {
      key: " ",
      label: "Space",
      description: "Start / Stop analysis",
      action: () => (isRunning ? handleStop() : handleStart()),
    },
    {
      key: "s",
      label: "S",
      description: "Take snapshot",
      action: () => {
        if (isRunning) takeSnapshot();
      },
    },
    {
      key: "r",
      label: "R",
      description: "Reset session",
      action: handleReset,
    },
    {
      key: "v",
      label: "V",
      description: "Toggle voice narration",
      action: toggleVoice,
    },
    {
      key: "f",
      label: "F",
      description: "Toggle class filter",
      action: () => setShowFilters((p) => !p),
    },
    {
      key: "m",
      label: "M",
      description: "Toggle microphone",
      action: toggleListening,
    },
    {
      key: "?",
      label: "?",
      description: "Show / hide shortcut help",
      action: () => setShowHelp((p) => !p),
    },
    {
      key: "Escape",
      label: "Esc",
      description: "Close modals / dismiss alert",
      action: () => {
        dismissAlert();
        setShowHelp(false);
        setShowFilters(false);
      },
    },
  ];
  useKeyboardShortcuts(SHORTCUTS);
  // Filtered objects (hide muted labels in viewer)
  const filteredObjects = sceneState.objects.filter(
    (o) => !mutedLabels.has(o.label),
  );

  return (
    <div className="flex flex-col h-full min-h-0 gap-0">
      {/* Demo walkthrough overlay */}
      <DemoWalkthrough open={showTour} onClose={() => setShowTour(false)} />

      {/* Help modal */}
      <HelpModal
        open={showHelp}
        onClose={() => setShowHelp(false)}
        shortcuts={SHORTCUTS.map((s) => ({
          key: s.key,
          description: s.description,
        }))}
      />

      {/* Alert banner */}
      <AlertBanner alert={activeAlert} onDismiss={dismissAlert} />

      {/* Top toolbar — wraps to 2 rows on mobile */}
      <div className="flex flex-wrap items-center gap-2 px-3 py-2.5 border-b border-white/8 bg-dark-800/50 backdrop-blur-sm flex-shrink-0">
        {/* Row 1 left: title + status */}
        <div className="flex items-center gap-2 mr-auto">
          <h1 className="font-display text-base sm:text-lg font-bold text-white whitespace-nowrap">
            Scene <span className="text-brand">Analyzer</span>
          </h1>
          {isRunning && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-neon-green/12 border border-neon-green/25"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-neon-green animate-pulse" />
              <span className="text-neon-green text-[10px] font-mono font-semibold">
                LIVE
              </span>
            </motion.div>
          )}
          {!isConnected && (
            <span className="hidden sm:inline text-[10px] font-mono text-neon-orange/70 px-2 py-0.5 rounded-full bg-neon-orange/10 border border-neon-orange/20">
              Demo
            </span>
          )}
        </div>

        {/* Confidence slider — always visible, compact on mobile */}
        <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-dark-600/60 border border-white/8">
          <span className="text-[10px] text-white/40 font-mono">CONF</span>
          <input
            type="range"
            min={0.05}
            max={0.8}
            step={0.05}
            value={conf}
            onChange={(e) => setConf(parseFloat(e.target.value))}
            className="w-16 sm:w-20 h-1 accent-brand cursor-pointer"
          />
          <span className="text-[10px] font-mono text-brand w-6 text-right">
            {Math.round(conf * 100)}%
          </span>
        </div>

        {/* Mic bar */}
        <MicBar
          isListening={isListening}
          isSupported={micSupported}
          micLevel={micLevel}
          transcript={transcript}
          error={micError}
          onToggle={toggleListening}
          disabled={false}
        />

        <span className="w-px h-5 bg-white/10" />

        {/* Action buttons */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowFilters((v) => !v)}
          icon={<SlidersHorizontal size={14} />}
          title="Toggle class filter"
        >
          <span className="hidden sm:inline">Filter</span>
        </Button>

        <Button
          variant={showHeatmap ? "primary" : "ghost"}
          size="sm"
          onClick={() => setShowHeatmap((v) => !v)}
          icon={<Flame size={14} />}
          title="Toggle heatmap overlay"
        >
          <span className="hidden sm:inline">Heat</span>
        </Button>

        <Button
          variant={useStream ? "primary" : "ghost"}
          size="sm"
          onClick={() => setUseStream((v) => !v)}
          icon={<Wifi size={14} />}
          title="Toggle Stream Video camera"
          data-tour="stream-btn"
        >
          <span className="hidden sm:inline">Stream</span>
        </Button>

        <Button
          variant="ghost"
          size="sm"
          onClick={takeSnapshot}
          icon={<Camera size={14} />}
          disabled={!isRunning}
          title="Take snapshot"
        >
          <span className="hidden sm:inline">Snap</span>
        </Button>

        <Button
          variant="ghost"
          size="sm"
          onClick={exportAnnotatedSnapshot}
          icon={<Share2 size={14} />}
          disabled={!isRunning}
          title="Export annotated PNG"
        >
          <span className="hidden sm:inline">Export</span>
        </Button>

        <Button
          variant="ghost"
          size="sm"
          onClick={toggleVoice}
          icon={voiceEnabled ? <Volume2 size={14} /> : <VolumeX size={14} />}
          title={voiceEnabled ? "Mute voice" : "Unmute voice"}
        >
          <span className="hidden sm:inline">
            {voiceEnabled ? "Voice On" : "Voice Off"}
          </span>
        </Button>

        <Button
          variant="ghost"
          size="sm"
          onClick={handleReset}
          icon={<RotateCcw size={14} />}
          title="Reset session"
        >
          <span className="hidden sm:inline">Reset</span>
        </Button>

        {isRunning ? (
          <Button
            variant="danger"
            size="sm"
            onClick={handleStop}
            icon={<Square size={14} />}
          >
            Stop
          </Button>
        ) : (
          <Button
            variant="success"
            size="sm"
            onClick={handleStart}
            icon={<Play size={14} />}
            data-tour="start-btn"
          >
            Start
          </Button>
        )}

        <button
          onClick={() => setShowTour(true)}
          title="Demo tour"
          aria-label="Start demo tour"
          className="w-7 h-7 flex items-center justify-center rounded-lg
                     text-neon-cyan/60 hover:text-neon-cyan hover:bg-neon-cyan/8
                     border border-transparent hover:border-neon-cyan/20 transition-colors"
        >
          <Zap size={14} />
        </button>

        <button
          onClick={() => setShowHelp((p) => !p)}
          title="Keyboard shortcuts (?)"
          aria-label="Keyboard shortcuts"
          className="w-7 h-7 flex items-center justify-center rounded-lg
                     text-white/30 hover:text-white/70 hover:bg-white/6
                     border border-transparent hover:border-white/10 transition-colors"
        >
          <HelpCircle size={14} />
        </button>
      </div>

      {/* Demo scenario presets */}
      <div data-tour="preset-bar">
        <PresetBar onApply={applyPreset} activePresetId={activePresetId} />
      </div>

      {/* Filter chips row */}
      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden border-b border-white/6 bg-dark-800/40 backdrop-blur-sm"
          >
            <div className="flex flex-wrap items-center gap-2 px-4 py-2">
              <span className="text-[11px] text-white/30 font-mono uppercase tracking-wider mr-1">
                Hide class:
              </span>
              {visibleLabels.length === 0 && (
                <span className="text-[11px] text-white/20 italic">
                  No objects detected yet
                </span>
              )}
              {visibleLabels.map((label) => (
                <button
                  key={label}
                  onClick={() => toggleMuted(label)}
                  className={`px-2.5 py-0.5 rounded-full text-xs font-mono border transition-all ${
                    mutedLabels.has(label)
                      ? "bg-neon-red/15 border-neon-red/40 text-neon-red line-through"
                      : "bg-white/6 border-white/12 text-white/60 hover:border-white/25 hover:text-white/80"
                  }`}
                >
                  {label}
                </button>
              ))}
              {mutedLabels.size > 0 && (
                <button
                  onClick={() => setMutedLabels(new Set())}
                  className="ml-2 text-[11px] text-white/30 hover:text-white/60 underline"
                >
                  clear all
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main layout */}
      <div className="flex-1 overflow-y-auto md:overflow-hidden md:min-h-0 grid grid-cols-1 lg:grid-cols-12 gap-4 p-3 sm:p-4">
        {/* Left: Camera + Snapshots + Narrator */}
        <div className="lg:col-span-7 flex flex-col gap-4 md:min-h-0">
          {/* Stream error banner */}
          {streamError && (
            <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-red-500/10 border border-red-500/25 text-red-400 text-sm">
              <Wifi size={14} />
              <span className="flex-1">Stream error: {streamError}</span>
              <button
                onClick={() => setUseStream(false)}
                className="text-red-400/60 hover:text-red-400"
              >
                <X size={14} />
              </button>
            </div>
          )}

          {/* Camera */}
          <div data-tour="scene-viewer">
            <SceneViewer
              objects={filteredObjects}
              isRunning={isRunning}
              onFrame={handleSetFrame}
              error={error}
              showHeatmap={showHeatmap}
              useStream={useStream}
              streamClient={streamClient}
              streamCall={streamCall}
              streamCaptureFrame={streamCaptureFrame}
              streamConnecting={streamConnecting}
            />
          </div>

          {/* Snapshot strip */}
          <AnimatePresence>
            {snapshots.length > 0 && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="flex gap-2 overflow-x-auto pb-1 flex-shrink-0 scroll-smooth snap-x snap-mandatory"
              >
                {snapshots.map((src, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="relative flex-shrink-0 group snap-start"
                  >
                    <img
                      src={src}
                      alt={`Snapshot ${i + 1}`}
                      className="h-16 w-auto rounded-lg border border-white/10 object-cover"
                    />
                    <button
                      onClick={() =>
                        setSnapshots((prev) => prev.filter((_, j) => j !== i))
                      }
                      className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-dark-600 border border-white/20 text-white/60 hover:text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X size={9} />
                    </button>
                    <span className="absolute bottom-1 left-1 text-[9px] font-mono text-white/50 bg-black/50 px-1 rounded">
                      #{snapshots.length - i}
                    </span>
                  </motion.div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Narration panel */}
          <div
            className="md:flex-1 md:min-h-0"
            style={{ minHeight: 240 }}
            data-tour="narrator-panel"
          >
            <NarratorPanel
              currentNarration={currentNarration}
              narrations={narrations}
              isSpeaking={isSpeaking && voiceEnabled}
              isActive={isActive}
              onToggleVoice={toggleVoice}
            />
          </div>
        </div>

        {/* Right: Activity + Alerts + Dashboard */}
        <div className="lg:col-span-5 flex flex-col gap-4 md:min-h-0 md:overflow-y-auto">
          <div className="h-[220px] sm:h-[280px]">
            <ActivityFeed activities={activities} />
          </div>
          <div data-tour="alert-panel">
            <AlertPanel
              goals={goals}
              alerts={alerts}
              onAddGoal={addGoal}
              onRemoveGoal={removeGoal}
              onToggleGoal={toggleGoal}
              onClearAlerts={clearAlerts}
            />
          </div>
          <DwellPanel objects={filteredObjects} isRunning={isRunning} />
          <Dashboard
            stats={{
              ...stats,
              narrationCount: narrations.length,
              activityCount: activities.length,
            }}
            activities={activities}
            labelCounts={labelCounts}
            fpsHistory={fpsHistory}
          />
        </div>
      </div>
    </div>
  );
};

export default Analyze;
