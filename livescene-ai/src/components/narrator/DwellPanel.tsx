import React, { useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Timer } from "lucide-react";
import { DetectedObject } from "../../types";

interface DwellEntry {
  start: number; // epoch ms when label first appeared in current session
  total: number; // accumulated seconds (may span multiple appearances)
}

interface DwellPanelProps {
  objects: DetectedObject[];
  isRunning: boolean;
}

/** Colour ramp from green → yellow → orange → red based on dwell seconds */
function dwellColour(secs: number): string {
  if (secs < 10) return "#22c55e"; // green
  if (secs < 30) return "#eab308"; // yellow
  if (secs < 60) return "#f97316"; // orange
  return "#ef4444"; // red
}

const DwellPanel: React.FC<DwellPanelProps> = ({ objects, isRunning }) => {
  // Map<label, DwellEntry>
  const dwellRef = useRef<Map<string, DwellEntry>>(new Map());
  // Snapshot of accumulated totals for render (updated each tick)
  const [entries, setEntries] = React.useState<
    { label: string; secs: number }[]
  >([]);

  // Track labels currently visible
  const prevLabelsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!isRunning) {
      // Freeze totals; don't reset (persist until user manually resets)
      prevLabelsRef.current.clear();
      return;
    }

    const now = Date.now();
    const currentLabels = new Set(objects.map((o) => o.label));

    // New labels that just appeared — start their timer
    currentLabels.forEach((label) => {
      if (!prevLabelsRef.current.has(label)) {
        const existing = dwellRef.current.get(label);
        dwellRef.current.set(label, {
          start: now,
          total: existing?.total ?? 0,
        });
      }
    });

    // Labels that just disappeared — accumulate elapsed time
    prevLabelsRef.current.forEach((label) => {
      if (!currentLabels.has(label)) {
        const entry = dwellRef.current.get(label);
        if (entry && entry.start > 0) {
          dwellRef.current.set(label, {
            start: 0,
            total: entry.total + (now - entry.start) / 1000,
          });
        }
      }
    });

    prevLabelsRef.current = currentLabels;

    // Build display snapshot including currently-active labels
    const snapshot: { label: string; secs: number }[] = [];
    dwellRef.current.forEach((entry, label) => {
      const running = entry.start > 0 ? (Date.now() - entry.start) / 1000 : 0;
      snapshot.push({ label, secs: +(entry.total + running).toFixed(1) });
    });
    snapshot.sort((a, b) => b.secs - a.secs);
    setEntries(snapshot);
  }, [objects, isRunning]);

  // Live tick every second to update displayed values
  useEffect(() => {
    if (!isRunning) return;
    const id = setInterval(() => {
      const snapshot: { label: string; secs: number }[] = [];
      dwellRef.current.forEach((entry, label) => {
        const running = entry.start > 0 ? (Date.now() - entry.start) / 1000 : 0;
        snapshot.push({ label, secs: +(entry.total + running).toFixed(1) });
      });
      snapshot.sort((a, b) => b.secs - a.secs);
      setEntries(snapshot);
    }, 1000);
    return () => clearInterval(id);
  }, [isRunning]);

  // Reset when stopped
  useEffect(() => {
    if (!isRunning) return;
    // clear on fresh start (isRunning flipped to true)
    dwellRef.current.clear();
    prevLabelsRef.current.clear();
    setEntries([]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isRunning === true]);

  const maxSecs = Math.max(1, entries[0]?.secs ?? 1);

  if (entries.length === 0) {
    return (
      <div className="rounded-xl border border-white/10 bg-surface p-4 flex items-center gap-2 text-text-muted text-sm">
        <Timer size={16} />
        <span>
          Dwell tracker — start analysis to measure object presence time
        </span>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-white/10 bg-surface overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-white/10">
        <Timer size={16} className="text-brand" />
        <span className="text-sm font-semibold text-text-primary">
          Dwell Time
        </span>
        <span className="ml-auto text-xs text-text-muted">
          {entries.length} object{entries.length !== 1 ? "s" : ""}
        </span>
      </div>
      <div className="p-2 flex flex-col gap-1 max-h-56 overflow-y-auto scrollbar-none">
        <AnimatePresence initial={false}>
          {entries.map(({ label, secs }) => (
            <motion.div
              key={label}
              layout
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-white/5"
            >
              {/* colour dot */}
              <span
                className="w-2 h-2 rounded-full flex-shrink-0"
                style={{ background: dwellColour(secs) }}
              />
              {/* label */}
              <span className="text-xs text-text-primary w-24 truncate capitalize">
                {label}
              </span>
              {/* bar */}
              <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
                <motion.div
                  className="h-full rounded-full"
                  style={{ background: dwellColour(secs) }}
                  animate={{ width: `${(secs / maxSecs) * 100}%` }}
                  transition={{ type: "spring", stiffness: 120, damping: 20 }}
                />
              </div>
              {/* time */}
              <span
                className="text-xs font-mono tabular-nums w-12 text-right"
                style={{ color: dwellColour(secs) }}
              >
                {secs >= 60
                  ? `${Math.floor(secs / 60)}m ${Math.round(secs % 60)}s`
                  : `${secs.toFixed(1)}s`}
              </span>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default React.memo(DwellPanel);
