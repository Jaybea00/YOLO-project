import React, { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ChevronRight, ChevronLeft, Zap } from "lucide-react";

// ── Step definitions ──────────────────────────────────────────────────────────
export interface WalkthroughStep {
  /** CSS selector of the element to spotlight */
  target: string;
  title: string;
  description: string;
  position?: "top" | "bottom" | "left" | "right";
}

const STEPS: WalkthroughStep[] = [
  {
    target: "[data-tour='start-btn']",
    title: "1 · Start the analyzer",
    description:
      "Click Start to connect to the backend, activate your camera and begin the YOLO + Gemini pipeline.",
    position: "bottom",
  },
  {
    target: "[data-tour='scene-viewer']",
    title: "2 · Live scene view",
    description:
      "YOLOv8s draws bounding boxes around every detected object in real time at 500 ms intervals. Confidence scores appear on each box.",
    position: "bottom",
  },
  {
    target: "[data-tour='narrator-panel']",
    title: "3 · AI narration",
    description:
      "Every 3rd frame Gemini 2.0 Flash narrates the scene in natural language. Click the speaker icon to hear it read aloud.",
    position: "left",
  },
  {
    target: "[data-tour='alert-panel']",
    title: "4 · Smart goal alerts",
    description:
      'Type a plain-English goal like "Alert if a person appears". The memory engine matches live detections and fires audio + visual alerts.',
    position: "left",
  },
  {
    target: "[data-tour='preset-bar']",
    title: "5 · One-click presets",
    description:
      "Security, Workspace and Activity modes pre-load curated goal bundles — perfect for a quick demo.",
    position: "bottom",
  },
  {
    target: "[data-tour='stream-btn']",
    title: "6 · Stream Video mode",
    description:
      "Toggle to Stream Video SDK to run the entire AI pipeline on an encrypted peer-to-peer video call instead of the local webcam.",
    position: "bottom",
  },
];

// ── Helpers ───────────────────────────────────────────────────────────────────
function getElementRect(selector: string): DOMRect | null {
  const el = document.querySelector(selector);
  return el ? el.getBoundingClientRect() : null;
}

const PAD = 10; // spotlight padding in px

// ── Component ─────────────────────────────────────────────────────────────────
interface DemoWalkthroughProps {
  open: boolean;
  onClose: () => void;
}

const DemoWalkthrough: React.FC<DemoWalkthroughProps> = ({ open, onClose }) => {
  const [stepIdx, setStepIdx] = useState(0);
  const [rect, setRect] = useState<DOMRect | null>(null);

  const step = STEPS[stepIdx];
  const isLast = stepIdx === STEPS.length - 1;
  const isFirst = stepIdx === 0;

  // Recompute spotlight rect when step changes or window resizes
  const updateRect = useCallback(() => {
    setRect(getElementRect(step.target));
  }, [step.target]);

  useEffect(() => {
    if (!open) return;
    updateRect();
    window.addEventListener("resize", updateRect);
    return () => window.removeEventListener("resize", updateRect);
  }, [open, updateRect]);

  // Scroll the target element into view
  useEffect(() => {
    if (!open) return;
    const el = document.querySelector(step.target);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [open, step.target]);

  const next = () => {
    if (!isLast) setStepIdx((i) => i + 1);
    else onClose();
  };
  const prev = () => {
    if (!isFirst) setStepIdx((i) => i - 1);
  };

  // Tooltip position calculation
  const tooltipStyle = (): React.CSSProperties => {
    if (!rect)
      return { top: "50%", left: "50%", transform: "translate(-50%,-50%)" };
    const pos = step.position ?? "bottom";
    const vw = window.innerWidth;
    const base: React.CSSProperties = { position: "fixed", zIndex: 1001 };
    const TW = 320; // tooltip width
    if (pos === "bottom") {
      return {
        ...base,
        top: rect.bottom + PAD + 8,
        left: Math.min(rect.left, vw - TW - 16),
      };
    }
    if (pos === "top") {
      return {
        ...base,
        bottom: window.innerHeight - rect.top + 8,
        left: Math.min(rect.left, vw - TW - 16),
      };
    }
    if (pos === "right") {
      return { ...base, top: rect.top, left: rect.right + 8 };
    }
    // left
    return { ...base, top: rect.top, right: window.innerWidth - rect.left + 8 };
  };

  if (!open) return null;

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Dim overlay with cutout */}
          <motion.div
            key="overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[1000] pointer-events-none"
            style={{
              background: rect
                ? `radial-gradient(ellipse ${rect.width / 2 + PAD * 2}px ${rect.height / 2 + PAD * 2}px at ${rect.left + rect.width / 2}px ${rect.top + rect.height / 2}px, transparent 100%, rgba(0,0,0,0.75) 100%)`
                : "rgba(0,0,0,0.75)",
            }}
          />

          {/* Spotlight ring */}
          {rect && (
            <motion.div
              key={`ring-${stepIdx}`}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="fixed z-[1000] rounded-xl border-2 border-brand pointer-events-none shadow-glow-brand"
              style={{
                top: rect.top - PAD,
                left: rect.left - PAD,
                width: rect.width + PAD * 2,
                height: rect.height + PAD * 2,
              }}
            />
          )}

          {/* Tooltip card */}
          <motion.div
            key={`tip-${stepIdx}`}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ duration: 0.25 }}
            style={{ ...tooltipStyle(), width: 320 }}
            className="bg-dark-800 border border-brand/30 rounded-2xl p-5 shadow-2xl z-[1001]"
          >
            {/* Header */}
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-brand/20 flex items-center justify-center">
                  <Zap size={13} className="text-brand" />
                </div>
                <span className="text-xs text-brand font-semibold uppercase tracking-widest">
                  Demo Tour
                </span>
              </div>
              <button
                onClick={onClose}
                aria-label="Close walkthrough"
                className="text-white/30 hover:text-white/80 transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            <h3 className="font-bold text-white text-base mb-1">
              {step.title}
            </h3>
            <p className="text-text-secondary text-sm leading-relaxed mb-4">
              {step.description}
            </p>

            {/* Progress dots */}
            <div className="flex items-center gap-1.5 mb-4">
              {STEPS.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setStepIdx(i)}
                  aria-label={`Go to step ${i + 1}`}
                  className={`h-1.5 rounded-full transition-all ${
                    i === stepIdx ? "w-6 bg-brand" : "w-1.5 bg-white/20"
                  }`}
                />
              ))}
            </div>

            {/* Navigation */}
            <div className="flex items-center justify-between gap-3">
              <button
                onClick={prev}
                disabled={isFirst}
                aria-label="Previous step"
                className="flex items-center gap-1.5 text-sm text-white/50 hover:text-white disabled:opacity-20 transition-colors"
              >
                <ChevronLeft size={15} /> Back
              </button>
              <button
                onClick={next}
                aria-label={isLast ? "Finish tour" : "Next step"}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-brand text-white text-sm font-medium hover:bg-brand/80 transition-colors"
              >
                {isLast ? "Finish" : "Next"} <ChevronRight size={15} />
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default DemoWalkthrough;
