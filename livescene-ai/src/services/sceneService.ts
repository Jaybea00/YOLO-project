import {
  DetectedObject,
  SceneState,
  NarrationEntry,
  ActivityEvent,
} from "../types";
import { generateUniqueId } from "../utils/helpers";
import theme from "../styles/theme";

// ─── Build structured scene state from raw detections ────────────────────────

export function buildSceneState(objects: DetectedObject[]): SceneState {
  return {
    objects,
    objectCount: objects.length,
    labels: objects.map((o) => o.label),
    timestamp: Date.now(),
  };
}

// ─── Assign colors to objects by class ───────────────────────────────────────

export function colorizeObjects(objects: DetectedObject[]): DetectedObject[] {
  return objects.map((obj) => ({
    ...obj,
    color: theme.objectColors[obj.label] || theme.objectColors.default,
  }));
}

// ─── Build diff summary between two scene states ─────────────────────────────

export interface SceneDiff {
  appeared: string[];
  disappeared: string[];
  persisted: string[];
  changed: boolean;
}

export function diffScenes(
  current: SceneState,
  previous: SceneState,
): SceneDiff {
  const curLabels = new Set(current.labels);
  const prevLabels = new Set(previous.labels);

  const appeared = [...curLabels].filter((l) => !prevLabels.has(l));
  const disappeared = [...prevLabels].filter((l) => !curLabels.has(l));
  const persisted = [...curLabels].filter((l) => prevLabels.has(l));

  return {
    appeared,
    disappeared,
    persisted,
    changed: appeared.length > 0 || disappeared.length > 0,
  };
}

// ─── Convert diff into natural language prompt for LLM ───────────────────────

export function buildLLMPrompt(
  current: SceneState,
  previous: SceneState,
  diff: SceneDiff,
  sessionDurationMs: number,
): string {
  const duration = Math.floor(sessionDurationMs / 1000);
  const objectDesc = current.objects
    .map((o) => `${o.label} (${Math.round(o.confidence * 100)}% confidence)`)
    .join(", ");

  return `You are an AI scene narrator. Describe what you observe concisely in 1-2 sentences.

Session running for: ${duration}s
Current objects: ${objectDesc || "none"}
New objects: ${diff.appeared.join(", ") || "none"}
Objects that left: ${diff.disappeared.join(", ") || "none"}
Persisting objects: ${diff.persisted.join(", ") || "none"}

Respond with only the narration text.`;
}

// ─── Format timestamps ────────────────────────────────────────────────────────

export function formatEventTime(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
}

// ─── Save session to localStorage ────────────────────────────────────────────

const SESSIONS_KEY = "livescene_sessions";

export function saveSession(data: {
  startTime: number;
  endTime: number;
  narrations: NarrationEntry[];
  activities: ActivityEvent[];
  objects: string[];
  labelCounts?: Record<string, number>;
}) {
  const sessions = loadSessions();
  const session = {
    id: generateUniqueId(),
    ...data,
    durationMs: data.endTime - data.startTime,
    totalObjects: data.activities.filter((a) => a.type === "object_appeared")
      .length,
    uniqueLabels: [...new Set(data.objects)],
    labelCounts: data.labelCounts ?? {},
  };
  sessions.unshift(session);
  localStorage.setItem(SESSIONS_KEY, JSON.stringify(sessions.slice(0, 20)));
  return session;
}

export function loadSessions() {
  try {
    const raw = localStorage.getItem(SESSIONS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function clearSessions() {
  localStorage.removeItem(SESSIONS_KEY);
}
