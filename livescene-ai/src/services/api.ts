import axios from "axios";
import {
  AnalysisRequest,
  AnalysisResponse,
  BackendStatus,
  DetectedObject,
} from "../types";

const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 5000,
  headers: { "Content-Type": "application/json" },
});

// ─── Health & Status ──────────────────────────────────────────────────────────

export async function checkBackendStatus(): Promise<BackendStatus> {
  try {
    const res = await api.get("/api/status");
    return res.data as BackendStatus;
  } catch {
    return {
      connected: false,
      yoloReady: false,
      llmReady: false,
      fps: 0,
      error: "Backend offline",
    };
  }
}

// ─── Scene Detection ──────────────────────────────────────────────────────────

export async function detectObjects(
  req: AnalysisRequest,
): Promise<DetectedObject[]> {
  const res = await api.post<AnalysisResponse>("/api/detect", req);
  return res.data.objects;
}

export async function analyzeScene(
  req: AnalysisRequest,
): Promise<AnalysisResponse> {
  const res = await api.post<AnalysisResponse>("/api/analyze", req);
  return res.data;
}

// ─── History ─────────────────────────────────────────────────────────────────

export async function fetchSessionHistory() {
  const res = await api.get("/api/sessions");
  return res.data;
}

export async function fetchSessionById(sessionId: string) {
  const res = await api.get(`/api/sessions/${sessionId}`);
  return res.data;
}

export async function deleteSession(sessionId: string) {
  await api.delete(`/api/sessions/${sessionId}`);
}

export default api;
