/**
 * useSettings — persistent user preferences stored in localStorage.
 * Exposes typed settings + a setter that auto-saves to localStorage.
 */
import { useState, useCallback } from "react";

export interface AppSettings {
  /** YOLO model variant */
  yoloModel: "yolov8n" | "yolov8s" | "yolov8m";
  /** Default confidence threshold (0.05 – 0.80) */
  defaultConf: number;
  /** Narrate every N frames (1 = every frame, 3 = every 3rd) */
  narrateEveryN: number;
  /** Speech synthesis rate (0.5 – 2.0) */
  voiceSpeed: number;
  /** Show fps counter in toolbar */
  showFps: boolean;
}

const STORAGE_KEY = "livescene_settings";

const DEFAULTS: AppSettings = {
  yoloModel: "yolov8s",
  defaultConf: 0.2,
  narrateEveryN: 3,
  voiceSpeed: 1.0,
  showFps: true,
};

function load(): AppSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULTS;
    return { ...DEFAULTS, ...JSON.parse(raw) };
  } catch {
    return DEFAULTS;
  }
}

export function useSettings() {
  const [settings, setSettingsState] = useState<AppSettings>(load);

  const updateSettings = useCallback((patch: Partial<AppSettings>) => {
    setSettingsState((prev) => {
      const next = { ...prev, ...patch };
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {
        /* quota exceeded — silently ignore */
      }
      return next;
    });
  }, []);

  const resetSettings = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setSettingsState(DEFAULTS);
  }, []);

  return { settings, updateSettings, resetSettings };
}
