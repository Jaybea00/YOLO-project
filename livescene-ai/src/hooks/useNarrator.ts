import { useCallback, useEffect, useRef, useState } from "react";
import {
  NarrationEntry,
  ActivityEvent,
  DetectedObject,
  MemoryState,
  WsNarrationPayload,
} from "../types";
import { generateUniqueId } from "../utils/helpers";
import theme from "../styles/theme";

const NARRATION_INTERVAL_MS = 2500;
const MAX_NARRATIONS = 50;
const MAX_ACTIVITIES = 100;

// ─── Simulated LLM narration (replace with real API call) ─────────────────────
function buildNarration(
  current: DetectedObject[],
  previous: DetectedObject[],
  memory: MemoryState,
): string {
  const currentLabels = current.map((o) => o.label);
  const prevLabels = previous.map((o) => o.label);

  const appeared = currentLabels.filter((l) => !prevLabels.includes(l));
  const disappeared = prevLabels.filter((l) => !currentLabels.includes(l));

  if (current.length === 0 && previous.length > 0) {
    return "The scene is now empty. All objects have left the frame.";
  }
  if (current.length === 0) {
    return "The scene is empty. Waiting for activity...";
  }
  if (appeared.length > 0 && disappeared.length === 0) {
    return `${appeared.join(", ")} ${appeared.length > 1 ? "have" : "has"} entered the scene.`;
  }
  if (disappeared.length > 0 && appeared.length === 0) {
    return `${disappeared.join(", ")} ${disappeared.length > 1 ? "have" : "has"} left the frame.`;
  }
  if (appeared.length > 0 && disappeared.length > 0) {
    return `${appeared.join(", ")} appeared while ${disappeared.join(", ")} left the scene.`;
  }

  // Describe current scene
  const labelCounts: Record<string, number> = {};
  currentLabels.forEach((l) => {
    labelCounts[l] = (labelCounts[l] || 0) + 1;
  });
  const parts = Object.entries(labelCounts).map(([l, c]) =>
    c > 1 ? `${c} ${l}s` : `a ${l}`,
  );
  return `Scene contains ${parts.join(", ")}.`;
}

function diffObjects(
  current: DetectedObject[],
  previous: DetectedObject[],
): ActivityEvent[] {
  const events: ActivityEvent[] = [];
  const currentLabels = new Set(current.map((o) => o.label));
  const prevLabels = new Set(previous.map((o) => o.label));

  currentLabels.forEach((label) => {
    if (!prevLabels.has(label)) {
      events.push({
        id: generateUniqueId(),
        type: "object_appeared",
        label,
        description: `${label} appeared in the scene`,
        timestamp: Date.now(),
        color: theme.objectColors[label] || theme.objectColors.default,
      });
    }
  });

  prevLabels.forEach((label) => {
    if (!currentLabels.has(label)) {
      events.push({
        id: generateUniqueId(),
        type: "object_disappeared",
        label,
        description: `${label} left the scene`,
        timestamp: Date.now(),
        color: theme.colors.textMuted,
      });
    }
  });

  if (current.length === 0 && previous.length > 0) {
    events.push({
      id: generateUniqueId(),
      type: "scene_empty",
      label: "Scene",
      description: "The scene is now empty",
      timestamp: Date.now(),
      color: theme.colors.neonOrange,
    });
  }

  return events;
}

export function useNarrator() {
  const [narrations, setNarrations] = useState<NarrationEntry[]>([]);
  const [activities, setActivities] = useState<ActivityEvent[]>([]);
  const [currentNarration, setCurrentNarration] = useState<string>(
    "Waiting for scene...",
  );
  const [isActive, setIsActive] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);

  const memoryRef = useRef<MemoryState>({
    tracked: {},
    snapshot: [],
    previousSnapshot: [],
    lastUpdated: 0,
  });

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const speechSynthRef = useRef<SpeechSynthesisUtterance | null>(null);

  // ── Voice narration ─────────────────────────────────────────────────────────
  const speak = useCallback((text: string) => {
    if (!("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance(text);
    utter.rate = 0.95;
    utter.pitch = 1.0;
    utter.volume = 0.8;
    utter.onstart = () => setIsSpeaking(true);
    utter.onend = () => setIsSpeaking(false);
    speechSynthRef.current = utter;
    window.speechSynthesis.speak(utter);
  }, []);

  // ── Process a new frame of detected objects ─────────────────────────────────
  const processObjects = useCallback(
    (objects: DetectedObject[]) => {
      const memory = memoryRef.current;
      const now = Date.now();

      // Update memory tracking
      const nextTracked = { ...memory.tracked };
      objects.forEach((obj) => {
        if (nextTracked[obj.label]) {
          nextTracked[obj.label].lastSeen = now;
          nextTracked[obj.label].durationMs =
            now - nextTracked[obj.label].firstSeen;
          nextTracked[obj.label].sightingCount += 1;
          nextTracked[obj.label].isPresent = true;
        } else {
          nextTracked[obj.label] = {
            id: obj.id,
            label: obj.label,
            firstSeen: now,
            lastSeen: now,
            durationMs: 0,
            sightingCount: 1,
            isPresent: true,
          };
        }
      });

      // Mark absent
      Object.keys(nextTracked).forEach((label) => {
        if (!objects.find((o) => o.label === label)) {
          nextTracked[label].isPresent = false;
        }
      });

      // Diff against previous snapshot
      const newActivities = diffObjects(objects, memory.snapshot);
      if (newActivities.length > 0) {
        setActivities((prev) =>
          [...newActivities, ...prev].slice(0, MAX_ACTIVITIES),
        );
      }

      // Build narration
      const narrationText = buildNarration(objects, memory.snapshot, memory);
      const changed =
        narrationText !== currentNarration ||
        objects.length !== memory.snapshot.length ||
        newActivities.length > 0;

      if (changed) {
        setCurrentNarration(narrationText);
        const entry: NarrationEntry = {
          id: generateUniqueId(),
          text: narrationText,
          timestamp: now,
          type: "narration",
          objects: objects.map((o) => o.label),
        };
        setNarrations((prev) => [entry, ...prev].slice(0, MAX_NARRATIONS));
        speak(narrationText);
      }

      memoryRef.current = {
        tracked: nextTracked,
        snapshot: objects,
        previousSnapshot: memory.snapshot,
        lastUpdated: now,
      };
    },
    [currentNarration, speak],
  );

  // ── Session controls ────────────────────────────────────────────────────────
  const startSession = useCallback(() => {
    setIsActive(true);
    const startEvent: ActivityEvent = {
      id: generateUniqueId(),
      type: "session_start",
      label: "Session",
      description: "Monitoring session started",
      timestamp: Date.now(),
      color: theme.colors.neonGreen,
    };
    setActivities((prev) => [startEvent, ...prev]);
    setCurrentNarration("Session started. Initializing scene analysis...");
  }, []);

  const stopSession = useCallback(() => {
    setIsActive(false);
    window.speechSynthesis?.cancel();
    setIsSpeaking(false);
    const stopEvent: ActivityEvent = {
      id: generateUniqueId(),
      type: "session_stop",
      label: "Session",
      description: "Monitoring session stopped",
      timestamp: Date.now(),
      color: theme.colors.neonRed,
    };
    setActivities((prev) => [stopEvent, ...prev]);
    setCurrentNarration("Session paused.");
  }, []);

  const clearHistory = useCallback(() => {
    setNarrations([]);
    setActivities([]);
    memoryRef.current = {
      tracked: {},
      snapshot: [],
      previousSnapshot: [],
      lastUpdated: 0,
    };
  }, []);

  // ── Inject real LLM narration from WebSocket ──────────────────────────────
  // Called by Analyze page when backend sends a "narration" WS message.
  const injectNarration = useCallback(
    (payload: WsNarrationPayload) => {
      const text = payload.narration;
      if (!text) return;

      setCurrentNarration(text);
      const entry: NarrationEntry = {
        id: generateUniqueId(),
        text,
        timestamp: payload.timestamp || Date.now(),
        type: "narration",
        objects: memoryRef.current.snapshot.map((o) => o.label),
      };
      setNarrations((prev) => [entry, ...prev].slice(0, MAX_NARRATIONS));
      speak(text);

      // Surface LLM insights as activity events
      if (payload.insights?.length) {
        const insightEvents: ActivityEvent[] = payload.insights.map((ins) => ({
          id: generateUniqueId(),
          type: "new_narration",
          label: payload.provider ?? "llm",
          description: ins,
          timestamp: payload.timestamp || Date.now(),
          color: theme.colors.brand,
        }));
        setActivities((prev) =>
          [...insightEvents, ...prev].slice(0, MAX_ACTIVITIES),
        );
      }
    },
    [speak],
  );

  // ── Inject a voice command as a feed entry ───────────────────────────────
  const pushVoiceEntry = useCallback((text: string) => {
    const entry: NarrationEntry = {
      id: generateUniqueId(),
      text,
      timestamp: Date.now(),
      type: "voice",
    };
    setNarrations((prev) => [entry, ...prev].slice(0, MAX_NARRATIONS));
  }, []);

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      window.speechSynthesis?.cancel();
    };
  }, []);

  return {
    narrations,
    activities,
    currentNarration,
    isActive,
    isSpeaking,
    memory: memoryRef.current,
    processObjects,
    injectNarration,
    pushVoiceEntry,
    startSession,
    stopSession,
    clearHistory,
    speak,
  };
}

export default useNarrator;
