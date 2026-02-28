// ─── Core Detection Types ────────────────────────────────────────────────────

export interface BoundingBox {
  x: number; // normalized 0–1
  y: number;
  width: number;
  height: number;
}

export interface DetectedObject {
  id: string;
  label: string;
  confidence: number;
  bbox: BoundingBox;
  color?: string; // assigned color for this object class
}

// ─── Memory / Tracking ───────────────────────────────────────────────────────

export interface TrackedObject {
  id: string;
  label: string;
  firstSeen: number; // timestamp ms
  lastSeen: number;
  durationMs: number;
  sightingCount: number;
  isPresent: boolean;
}

export interface MemoryState {
  tracked: Record<string, TrackedObject>;
  snapshot: DetectedObject[];
  previousSnapshot: DetectedObject[];
  lastUpdated: number;
}

// ─── Scene State ─────────────────────────────────────────────────────────────

export interface SceneState {
  objects: DetectedObject[];
  objectCount: number;
  labels: string[];
  timestamp: number;
  frameDataUrl?: string;
}

// ─── Narration ───────────────────────────────────────────────────────────────

export interface NarrationEntry {
  id: string;
  text: string;
  timestamp: number;
  type: "narration" | "insight" | "alert" | "system" | "voice";
  objects?: string[];
}

// ─── Activity Log ────────────────────────────────────────────────────────────

export type ActivityEventType =
  | "object_appeared"
  | "object_disappeared"
  | "scene_empty"
  | "scene_changed"
  | "new_narration"
  | "session_start"
  | "session_stop";

export interface ActivityEvent {
  id: string;
  type: ActivityEventType;
  label: string;
  description: string;
  timestamp: number;
  icon?: string;
  color?: string;
}

// ─── Session History ─────────────────────────────────────────────────────────

export interface SessionRecord {
  id: string;
  startTime: number;
  endTime: number;
  durationMs: number;
  totalObjects: number;
  uniqueLabels: string[];
  narrations: NarrationEntry[];
  activities: ActivityEvent[];
  thumbnail?: string;
  labelCounts?: Record<string, number>;
}

// ─── Dashboard Stats ─────────────────────────────────────────────────────────

export interface StatsData {
  sessionDuration: number;
  totalDetections: number;
  uniqueObjects: number;
  narrationCount: number;
  activityCount: number;
  fps: number;
  isLive: boolean;
}

// ─── API Types ───────────────────────────────────────────────────────────────

export interface AnalysisRequest {
  frameBase64: string;
  timestamp: number;
  sessionId: string;
}

export interface AnalysisResponse {
  objects: DetectedObject[];
  narration: string;
  sceneDescription: string;
  confidence: number;
  insights?: string[];
  llmProvider?: string;
  inferenceMs?: number;
}

export interface BackendStatus {
  connected: boolean;
  yoloReady: boolean;
  llmReady: boolean;
  moondreamReady?: boolean;
  llmProvider?: string;
  fps: number;
  activeSessions?: number;
  wsClients?: number;
  error?: string;
}

// ─── WebSocket Message Types ─────────────────────────────────────────────────

export type WsMessageType =
  | "frame"
  | "detection"
  | "narration"
  | "status"
  | "ping"
  | "pong"
  | "reset"
  | "reset_ack"
  | "error";

/** Message sent FROM frontend TO backend */
export interface WsFrameMessage {
  type: "frame";
  frame: string; // base64 JPEG data-URL
  sessionId: string;
  includeLLM: boolean;
  timestamp: number;
}

export interface WsPingMessage {
  type: "ping";
}

export interface WsResetMessage {
  type: "reset";
  sessionId: string;
}

/** Messages received FROM backend */
export interface WsDetectionPayload {
  type: "detection";
  objects: DetectedObject[];
  events: Array<{
    type: string;
    label: string;
    description: string;
    timestamp: number;
    confidence?: number;
  }>;
  objectCount: number;
  labelCounts?: Record<string, number>;
  timestamp: number;
}

export interface WsNarrationPayload {
  type: "narration";
  narration: string;
  sceneDescription: string;
  insights: string[];
  provider: string;
  confidence: number;
  timestamp: number;
}

export interface WsStatusPayload {
  type: "status";
  yoloReady: boolean;
  llmReady: boolean;
  llmProvider: string;
  sessionId: string;
}

export interface WsErrorPayload {
  type: "error";
  message: string;
}

export type WsInboundMessage =
  | WsDetectionPayload
  | WsNarrationPayload
  | WsStatusPayload
  | WsErrorPayload
  | { type: "pong" }
  | { type: "reset_ack"; sessionId: string };

// ─── Moondream ───────────────────────────────────────────────────────────────

export interface MoondreamAnswer {
  question: string;
  answer: string;
}

export interface AgentInsight {
  id: string;
  source: "llm" | "moondream" | "yolo";
  text: string;
  timestamp: number;
  confidence: number;
}
