import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Settings, RotateCcw } from "lucide-react";
import { AppSettings } from "../../hooks/useSettings";

interface SettingsModalProps {
  open: boolean;
  onClose: () => void;
  settings: AppSettings;
  onChange: (patch: Partial<AppSettings>) => void;
  onReset: () => void;
}

// ── Small reusable row ────────────────────────────────────────────────────────
const Row: React.FC<{
  label: string;
  hint?: string;
  children: React.ReactNode;
}> = ({ label, hint, children }) => (
  <div className="flex items-center justify-between gap-4 py-3 border-b border-white/6 last:border-0">
    <div className="min-w-0">
      <p className="text-sm text-white/80 font-medium">{label}</p>
      {hint && <p className="text-[11px] text-white/35 mt-0.5">{hint}</p>}
    </div>
    <div className="flex-shrink-0">{children}</div>
  </div>
);

const SettingsModal: React.FC<SettingsModalProps> = ({
  open,
  onClose,
  settings,
  onChange,
  onReset,
}) => {
  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            key="settings-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Panel */}
          <motion.div
            key="settings-panel"
            initial={{ opacity: 0, x: 48 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 48 }}
            transition={{ type: "spring", stiffness: 360, damping: 32 }}
            className="fixed z-50 right-0 top-0 h-full w-full max-w-xs
                       bg-dark-700 border-l border-white/10 shadow-2xl
                       flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/8 flex-shrink-0">
              <div className="flex items-center gap-2.5">
                <Settings size={16} className="text-brand" />
                <span className="font-semibold text-white text-sm">
                  Settings
                </span>
              </div>
              <button
                onClick={onClose}
                className="w-7 h-7 rounded-lg flex items-center justify-center
                           text-white/40 hover:text-white hover:bg-white/8 transition-colors"
              >
                <X size={14} />
              </button>
            </div>

            {/* Scrollable body */}
            <div className="flex-1 overflow-y-auto px-5 py-2">
              {/* ── Detection ──────────────────────────────────────────── */}
              <p className="text-[10px] font-mono uppercase tracking-widest text-white/30 mt-4 mb-1">
                Detection
              </p>

              <Row
                label="YOLO Model"
                hint="Larger models are more accurate but slower"
              >
                <select
                  value={settings.yoloModel}
                  onChange={(e) =>
                    onChange({
                      yoloModel: e.target.value as AppSettings["yoloModel"],
                    })
                  }
                  className="bg-dark-600 border border-white/12 rounded-lg text-sm text-white
                             px-2 py-1.5 focus:outline-none focus:border-brand/50 cursor-pointer"
                >
                  <option value="yolov8n">YOLOv8n (fastest)</option>
                  <option value="yolov8s">YOLOv8s (balanced)</option>
                  <option value="yolov8m">YOLOv8m (accurate)</option>
                </select>
              </Row>

              <Row
                label="Default Confidence"
                hint={`Min detection score: ${Math.round(settings.defaultConf * 100)}%`}
              >
                <div className="flex items-center gap-2">
                  <input
                    type="range"
                    min={0.05}
                    max={0.8}
                    step={0.05}
                    value={settings.defaultConf}
                    onChange={(e) =>
                      onChange({ defaultConf: parseFloat(e.target.value) })
                    }
                    className="w-24 h-1 accent-brand cursor-pointer"
                  />
                  <span className="text-xs font-mono text-brand w-8 text-right">
                    {Math.round(settings.defaultConf * 100)}%
                  </span>
                </div>
              </Row>

              {/* ── Narration ──────────────────────────────────────────── */}
              <p className="text-[10px] font-mono uppercase tracking-widest text-white/30 mt-5 mb-1">
                Narration
              </p>

              <Row
                label="Narrate Every N Frames"
                hint={`LLM called every ${settings.narrateEveryN} frame${settings.narrateEveryN > 1 ? "s" : ""}`}
              >
                <div className="flex items-center gap-2">
                  <input
                    type="range"
                    min={1}
                    max={10}
                    step={1}
                    value={settings.narrateEveryN}
                    onChange={(e) =>
                      onChange({ narrateEveryN: parseInt(e.target.value) })
                    }
                    className="w-20 h-1 accent-brand cursor-pointer"
                  />
                  <span className="text-xs font-mono text-brand w-4 text-right">
                    {settings.narrateEveryN}
                  </span>
                </div>
              </Row>

              <Row
                label="Voice Speed"
                hint={`Speech synthesis rate: ${settings.voiceSpeed.toFixed(1)}×`}
              >
                <div className="flex items-center gap-2">
                  <input
                    type="range"
                    min={0.5}
                    max={2.0}
                    step={0.1}
                    value={settings.voiceSpeed}
                    onChange={(e) =>
                      onChange({ voiceSpeed: parseFloat(e.target.value) })
                    }
                    className="w-20 h-1 accent-brand cursor-pointer"
                  />
                  <span className="text-xs font-mono text-brand w-8 text-right">
                    {settings.voiceSpeed.toFixed(1)}×
                  </span>
                </div>
              </Row>

              {/* ── Display ────────────────────────────────────────────── */}
              <p className="text-[10px] font-mono uppercase tracking-widest text-white/30 mt-5 mb-1">
                Display
              </p>

              <Row label="Show FPS in toolbar">
                <button
                  onClick={() => onChange({ showFps: !settings.showFps })}
                  className={`relative w-10 h-5 rounded-full transition-colors ${
                    settings.showFps ? "bg-brand" : "bg-dark-500"
                  }`}
                >
                  <span
                    className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${
                      settings.showFps ? "translate-x-5" : "translate-x-0.5"
                    }`}
                  />
                </button>
              </Row>
            </div>

            {/* Footer */}
            <div className="px-5 py-4 border-t border-white/8 flex-shrink-0">
              <button
                onClick={onReset}
                className="flex items-center gap-2 text-xs text-white/35
                           hover:text-white/65 transition-colors"
              >
                <RotateCcw size={12} />
                Reset to defaults
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default SettingsModal;
