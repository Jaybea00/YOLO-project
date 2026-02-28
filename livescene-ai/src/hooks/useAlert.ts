import { useCallback, useRef, useState } from "react";
import { generateUniqueId } from "../utils/helpers";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface AgentGoal {
  id: string;
  text: string; // e.g. "Alert me if a person picks up a phone"
  active: boolean;
  triggeredAt: number | null;
  triggerCount: number;
}

export interface AlertEvent {
  id: string;
  goalId: string;
  goalText: string;
  reason: string; // why the goal triggered (from Gemini)
  labels: string[]; // objects present when it fired
  timestamp: number;
}

// ─── Simple keyword matcher (no LLM needed for fast checks) ──────────────────
// Checks whether current detected labels satisfy the goal text.
// Works for most natural-language goals that mention object names.
function matchesGoal(goalText: string, labels: string[]): boolean {
  const g = goalText.toLowerCase();
  const labelsLower = labels.map((l) => l.toLowerCase());

  // Require ALL objects mentioned in the goal to be present
  const coco80 = [
    "person",
    "bicycle",
    "car",
    "motorcycle",
    "airplane",
    "bus",
    "train",
    "truck",
    "boat",
    "traffic light",
    "fire hydrant",
    "stop sign",
    "bench",
    "bird",
    "cat",
    "dog",
    "horse",
    "sheep",
    "cow",
    "elephant",
    "bear",
    "zebra",
    "giraffe",
    "backpack",
    "umbrella",
    "handbag",
    "tie",
    "suitcase",
    "frisbee",
    "skis",
    "snowboard",
    "sports ball",
    "kite",
    "baseball bat",
    "baseball glove",
    "skateboard",
    "surfboard",
    "tennis racket",
    "bottle",
    "wine glass",
    "cup",
    "fork",
    "knife",
    "spoon",
    "bowl",
    "banana",
    "apple",
    "sandwich",
    "orange",
    "broccoli",
    "carrot",
    "hot dog",
    "pizza",
    "donut",
    "cake",
    "chair",
    "couch",
    "potted plant",
    "bed",
    "dining table",
    "toilet",
    "tv",
    "laptop",
    "mouse",
    "remote",
    "keyboard",
    "cell phone",
    "microwave",
    "oven",
    "toaster",
    "sink",
    "refrigerator",
    "book",
    "clock",
    "vase",
    "scissors",
    "teddy bear",
    "hair drier",
    "toothbrush",
  ];

  // Find every COCO object name mentioned in the goal text
  const mentioned = coco80.filter((name) => g.includes(name));
  if (mentioned.length === 0) return false; // no known objects → can't match

  // All mentioned objects must appear in current labels
  return mentioned.every((name) => labelsLower.includes(name));
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useAlert() {
  const [goals, setGoals] = useState<AgentGoal[]>([]);
  const [alerts, setAlerts] = useState<AlertEvent[]>([]);
  const [activeAlert, setActiveAlert] = useState<AlertEvent | null>(null);

  // Track last-fired time per goal to avoid spamming (5 s cooldown)
  const cooldownRef = useRef<Record<string, number>>({});

  const addGoal = useCallback((text: string) => {
    if (!text.trim()) return;
    setGoals((prev) => [
      ...prev,
      {
        id: generateUniqueId(),
        text: text.trim(),
        active: true,
        triggeredAt: null,
        triggerCount: 0,
      },
    ]);
  }, []);

  const removeGoal = useCallback((id: string) => {
    setGoals((prev) => prev.filter((g) => g.id !== id));
  }, []);

  const toggleGoal = useCallback((id: string) => {
    setGoals((prev) =>
      prev.map((g) => (g.id === id ? { ...g, active: !g.active } : g)),
    );
  }, []);

  const dismissAlert = useCallback(() => setActiveAlert(null), []);

  const clearAlerts = useCallback(() => {
    setAlerts([]);
    setActiveAlert(null);
  }, []);

  /** Call this on every new detection frame with the current label list. */
  const checkGoals = useCallback(
    (labels: string[]) => {
      const now = Date.now();
      const COOLDOWN_MS = 5_000;

      goals.forEach((goal) => {
        if (!goal.active) return;
        const lastFired = cooldownRef.current[goal.id] ?? 0;
        if (now - lastFired < COOLDOWN_MS) return;

        if (matchesGoal(goal.text, labels)) {
          cooldownRef.current[goal.id] = now;

          const event: AlertEvent = {
            id: generateUniqueId(),
            goalId: goal.id,
            goalText: goal.text,
            reason: `Detected: ${labels.join(", ")}`,
            labels,
            timestamp: now,
          };

          setAlerts((prev) => [event, ...prev].slice(0, 50));
          setActiveAlert(event);

          // Update goal trigger count
          setGoals((prev) =>
            prev.map((g) =>
              g.id === goal.id
                ? { ...g, triggeredAt: now, triggerCount: g.triggerCount + 1 }
                : g,
            ),
          );

          // Play alert sound (Web Audio API — no file needed)
          try {
            const ctx = new AudioContext();
            [0, 150, 300].forEach((delay) => {
              const osc = ctx.createOscillator();
              const gain = ctx.createGain();
              osc.connect(gain);
              gain.connect(ctx.destination);
              osc.frequency.value = 880;
              gain.gain.setValueAtTime(0.3, ctx.currentTime + delay / 1000);
              gain.gain.exponentialRampToValueAtTime(
                0.001,
                ctx.currentTime + delay / 1000 + 0.2,
              );
              osc.start(ctx.currentTime + delay / 1000);
              osc.stop(ctx.currentTime + delay / 1000 + 0.25);
            });
          } catch {
            /* audio not available */
          }
        }
      });
    },
    [goals],
  );

  return {
    goals,
    alerts,
    activeAlert,
    addGoal,
    removeGoal,
    toggleGoal,
    checkGoals,
    dismissAlert,
    clearAlerts,
  };
}
