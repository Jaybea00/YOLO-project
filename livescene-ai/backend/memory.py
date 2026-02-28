"""
memory.py — Short-term object tracking engine for LiveScene AI.

Tracks which objects are present, how long they've been visible,
how many times they've been detected, and emits appear/disappear events.
"""

from __future__ import annotations

import time
from dataclasses import dataclass, field
from typing import Dict, List, Optional


# ─── Data Models ─────────────────────────────────────────────────────────────

@dataclass
class TrackedObject:
    label: str
    first_seen: float          # epoch seconds
    last_seen: float
    sighting_count: int = 1
    is_present: bool = True
    confidence_history: List[float] = field(default_factory=list)

    @property
    def duration_seconds(self) -> float:
        return self.last_seen - self.first_seen

    @property
    def avg_confidence(self) -> float:
        if not self.confidence_history:
            return 0.0
        return sum(self.confidence_history) / len(self.confidence_history)

    def to_dict(self) -> dict:
        return {
            "label": self.label,
            "firstSeen": self.first_seen,
            "lastSeen": self.last_seen,
            "durationSeconds": self.duration_seconds,
            "sightingCount": self.sighting_count,
            "isPresent": self.is_present,
            "avgConfidence": round(self.avg_confidence, 3),
        }


@dataclass
class SceneEvent:
    event_type: str   # "object_appeared" | "object_disappeared" | "scene_empty" | "scene_changed"
    label: str
    description: str
    timestamp: float
    confidence: Optional[float] = None

    def to_dict(self) -> dict:
        return {
            "type": self.event_type,
            "label": self.label,
            "description": self.description,
            "timestamp": self.timestamp,
            "confidence": self.confidence,
        }


# ─── Memory Engine ────────────────────────────────────────────────────────────

class MemoryEngine:
    """
    Maintains a rolling window of object sightings.
    Call update(detections) each frame to get a list of new events.
    
    detections: list of dicts with keys: label, confidence
    """

    # If an object isn't seen for this many seconds, it's considered gone
    DISAPPEAR_TIMEOUT_S: float = 3.0

    def __init__(self) -> None:
        self.tracked: Dict[str, TrackedObject] = {}
        self.previous_labels: set[str] = set()
        self.event_log: List[SceneEvent] = []
        self._session_start = time.time()

    # ── Public API ────────────────────────────────────────────────────────────

    def update(self, detections: List[dict]) -> List[SceneEvent]:
        """
        Feed new frame detections in.  Returns list of new SceneEvents.
        detections: [{"label": str, "confidence": float}, ...]
        """
        now = time.time()
        current_labels = {d["label"] for d in detections}
        events: List[SceneEvent] = []

        # Update / create tracked objects for what we see now
        for det in detections:
            label = det["label"]
            conf  = det.get("confidence", 1.0)

            if label in self.tracked:
                obj = self.tracked[label]
                obj.last_seen = now
                obj.sighting_count += 1
                obj.confidence_history.append(conf)
                # Keep history bounded
                if len(obj.confidence_history) > 50:
                    obj.confidence_history.pop(0)

                if not obj.is_present:
                    # Re-appeared after disappearing
                    obj.is_present = True
                    events.append(SceneEvent(
                        event_type="object_appeared",
                        label=label,
                        description=f"{label} has re-entered the scene.",
                        timestamp=now,
                        confidence=conf,
                    ))
            else:
                # Brand new object
                self.tracked[label] = TrackedObject(
                    label=label,
                    first_seen=now,
                    last_seen=now,
                    confidence_history=[conf],
                )
                events.append(SceneEvent(
                    event_type="object_appeared",
                    label=label,
                    description=f"{label} appeared in the scene.",
                    timestamp=now,
                    confidence=conf,
                ))

        # Check for disappearances (objects we were tracking but don't see now)
        for label, obj in self.tracked.items():
            if label not in current_labels and obj.is_present:
                if (now - obj.last_seen) >= self.DISAPPEAR_TIMEOUT_S:
                    obj.is_present = False
                    events.append(SceneEvent(
                        event_type="object_disappeared",
                        label=label,
                        description=f"{label} left the scene after {obj.duration_seconds:.1f}s.",
                        timestamp=now,
                    ))

        # Scene-level events
        if not current_labels and self.previous_labels:
            events.append(SceneEvent(
                event_type="scene_empty",
                label="scene",
                description="The scene is now empty.",
                timestamp=now,
            ))
        elif current_labels != self.previous_labels and current_labels and self.previous_labels:
            events.append(SceneEvent(
                event_type="scene_changed",
                label="scene",
                description="Scene composition changed.",
                timestamp=now,
            ))

        self.previous_labels = current_labels
        self.event_log.extend(events)
        # Keep event log bounded
        if len(self.event_log) > 500:
            self.event_log = self.event_log[-500:]

        return events

    def get_context_summary(self) -> str:
        """
        Returns a concise text summary of current memory state for the LLM prompt.
        """
        present = [obj for obj in self.tracked.values() if obj.is_present]
        absent  = [obj for obj in self.tracked.values() if not obj.is_present]

        lines = []
        if present:
            obj_desc = ", ".join(
                f"{o.label} (seen {o.sighting_count}x, {o.duration_seconds:.0f}s)"
                for o in sorted(present, key=lambda x: -x.sighting_count)
            )
            lines.append(f"Currently visible: {obj_desc}.")
        else:
            lines.append("No objects currently visible.")

        if absent:
            recent_absent = sorted(absent, key=lambda x: -x.last_seen)[:3]
            lines.append(
                "Recently left: " + ", ".join(o.label for o in recent_absent) + "."
            )

        session_duration = time.time() - self._session_start
        lines.append(f"Session running for {session_duration:.0f}s.")

        return " ".join(lines)

    def get_present_objects(self) -> List[TrackedObject]:
        return [o for o in self.tracked.values() if o.is_present]

    def get_snapshot(self) -> dict:
        return {
            "tracked": {k: v.to_dict() for k, v in self.tracked.items()},
            "presentCount": sum(1 for o in self.tracked.values() if o.is_present),
            "sessionDurationSeconds": time.time() - self._session_start,
        }

    def reset(self) -> None:
        self.tracked.clear()
        self.previous_labels.clear()
        self.event_log.clear()
        self._session_start = time.time()
