"""
main.py — FastAPI backend for LiveScene AI.

Endpoints:
  GET  /api/status        — health check, model readiness
  POST /api/detect        — single-frame YOLO detection
  POST /api/analyze       — YOLO + LLM narration + memory update
  POST /api/moondream     — visual Q&A via Moondream
  WS   /ws/stream         — real-time WebSocket: receive frames, push detections + narrations

Run:
  uvicorn main:app --host 0.0.0.0 --port 5000 --reload
"""

from __future__ import annotations

import asyncio
import base64
import collections
import io
import json
import logging
import os
import time
import uuid
from contextlib import asynccontextmanager
from pathlib import Path
from typing import Any, Deque, Dict, List, Optional, Set

# ── Stream token signing ───────────────────────────────────────────────────────
try:
    import jwt as _jwt          # PyJWT
    _HAS_JWT = True
except ImportError:
    _HAS_JWT = False

# ── Python 3.14 / PyTorch 2.10 compatibility fix ──────────────────────────────
# torchvision's dynamo import crashes on Python 3.14; suppress and continue.
try:
    import torch._dynamo as _dynamo          # type: ignore
    _dynamo.config.suppress_errors = True
except Exception:
    pass

import cv2
import numpy as np
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Request, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from PIL import Image
from pydantic import BaseModel
from ultralytics import YOLO  # type: ignore

from llm import LLMNarrator
from memory import MemoryEngine
from moondream import MoondreamClient

# ─── Setup ───────────────────────────────────────────────────────────────────

load_dotenv()
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  %(levelname)-8s  %(name)s  %(message)s",
)
logger = logging.getLogger("livescene")

_BACKEND_DIR    = Path(__file__).parent
YOLO_MODEL      = os.getenv("YOLO_MODEL", str(_BACKEND_DIR / "yolov8s.pt"))
YOLO_CONFIDENCE = float(os.getenv("YOLO_CONFIDENCE", "0.20"))   # lowered: catches small/distant objects
YOLO_IOU        = float(os.getenv("YOLO_IOU", "0.45"))
CORS_ORIGINS    = os.getenv("CORS_ORIGINS", "http://localhost:3000,http://localhost:3001").split(",")

# Stream Video credentials (set in .env)
STREAM_API_KEY    = os.getenv("STREAM_API_KEY", "")
STREAM_API_SECRET = os.getenv("STREAM_API_SECRET", "")

# ─── No class filter — detect ALL 80 COCO classes ────────────────────────────
# (previous version filtered to 34 classes, which missed many objects)

# ─── Global state (single-process) ───────────────────────────────────────────

yolo_model: Optional[YOLO] = None
narrator: Optional[LLMNarrator] = None
moondream: Optional[MoondreamClient] = None

# Per-session memory engines keyed by session_id
session_memory: Dict[str, MemoryEngine] = {}

# Completed / in-progress session records (survive WS disconnect)
completed_sessions: List[Dict[str, Any]] = []

# Connected WebSocket clients
ws_clients: Set[WebSocket] = set()


# ─── Lifespan (startup / shutdown) ───────────────────────────────────────────

@asynccontextmanager
async def lifespan(app: FastAPI):
    global yolo_model, narrator, moondream

    logger.info("⚡ Starting LiveScene AI backend…")

    # Load YOLO
    try:
        yolo_model = YOLO(YOLO_MODEL)
        # Warm-up pass (first inference is always slow — this makes real frames fast)
        dummy = np.zeros((480, 640, 3), dtype=np.uint8)
        yolo_model.predict(dummy, conf=YOLO_CONFIDENCE, verbose=False)
        logger.info("✅ YOLO loaded + warmed up: %s  (conf=%.2f, all 80 COCO classes)", YOLO_MODEL, YOLO_CONFIDENCE)
    except Exception as e:
        logger.error("❌ YOLO failed to load: %s", e)

    # Init LLM narrator
    narrator = LLMNarrator()

    # Init Moondream (lazy — loads on first request)
    moondream = MoondreamClient()

    yield  # ← server runs here

    logger.info("🛑 Shutting down LiveScene AI backend.")
    session_memory.clear()


# ─── App ─────────────────────────────────────────────────────────────────────

app = FastAPI(
    title="LiveScene AI API",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ─── Pydantic request / response models ──────────────────────────────────────

class DetectRequest(BaseModel):
    frame: str               # JPEG base64 string
    timestamp: Optional[int] = None
    session_id: Optional[str] = None

class MoondreamRequest(BaseModel):
    frame: str               # JPEG base64 string
    questions: Optional[List[str]] = None
    session_id: Optional[str] = None

class AnalyzeRequest(BaseModel):
    frame: str               # JPEG base64 string
    timestamp: Optional[int] = None
    session_id: Optional[str] = "default"
    include_moondream: Optional[bool] = False


# ─── Helpers ─────────────────────────────────────────────────────────────────

def decode_frame(b64: str, max_bytes: int = 2 * 1024 * 1024) -> np.ndarray:
    """Decode a base64 JPEG string to an OpenCV BGR ndarray.

    Raises ValueError for oversized or invalid frames.
    max_bytes default: 2 MB (base64-encoded ~= 1.5 MB raw JPEG).
    """
    # Strip data-URL prefix if present
    if "," in b64:
        b64 = b64.split(",", 1)[1]

    # Guard against enormous payloads before allocating memory
    if len(b64) > max_bytes * 4 // 3 + 64:
        raise ValueError(f"Frame too large: {len(b64)} chars (max ~{max_bytes} bytes)")

    img_bytes = base64.b64decode(b64)
    if len(img_bytes) > max_bytes:
        raise ValueError(f"Decoded frame too large: {len(img_bytes)} bytes (max {max_bytes})")

    arr = np.frombuffer(img_bytes, dtype=np.uint8)
    img = cv2.imdecode(arr, cv2.IMREAD_COLOR)
    if img is None:
        raise ValueError("Could not decode image frame")
    return img


def run_yolo(img: np.ndarray, conf_override: Optional[float] = None) -> List[dict]:
    """Run YOLO inference on all 80 COCO classes and return normalised detections."""
    if yolo_model is None:
        raise RuntimeError("YOLO model not loaded")

    t0 = time.perf_counter()
    effective_conf = conf_override if conf_override is not None else YOLO_CONFIDENCE

    results = yolo_model.predict(
        img,
        conf=effective_conf,
        iou=YOLO_IOU,
        imgsz=640,
        verbose=False,
        # NO classes= filter → detect everything
    )

    h, w = img.shape[:2]
    detections = []

    for result in results:
        if result.boxes is None:
            continue
        for box in result.boxes:
            cls_id = int(box.cls[0])
            label  = yolo_model.names.get(cls_id, f"object_{cls_id}")
            conf   = float(box.conf[0])
            x1, y1, x2, y2 = box.xyxy[0].tolist()

            detections.append({
                "id":    str(uuid.uuid4()),
                "label": label,
                "confidence": round(conf, 4),
                "bbox": {
                    "x":      round(x1 / w, 4),
                    "y":      round(y1 / h, 4),
                    "width":  round((x2 - x1) / w, 4),
                    "height": round((y2 - y1) / h, 4),
                },
            })

    elapsed_ms = (time.perf_counter() - t0) * 1000
    if detections:
        labels = [f"{d['label']}({int(d['confidence']*100)}%)" for d in detections]
        logger.info("🔍 YOLO %dms (conf=%.2f) → %d obj: %s", int(elapsed_ms), effective_conf, len(detections), ", ".join(labels))

    return detections


def get_or_create_memory(session_id: str) -> MemoryEngine:
    if session_id not in session_memory:
        session_memory[session_id] = MemoryEngine()
    return session_memory[session_id]


# ─── Routes ──────────────────────────────────────────────────────────────────

@app.get("/api/status")
async def status():
    return {
        "connected": True,
        "yoloReady": yolo_model is not None,
        "llmReady": narrator is not None and narrator.is_ready,
        "moondreamReady": moondream is not None and moondream.is_ready,
        "llmProvider": narrator.provider_name if narrator else "none",
        "yoloModel": YOLO_MODEL,
        "fps": 0,
        "activeSessions": len(session_memory),
        "wsClients": len(ws_clients),
        "sessions_saved": len(completed_sessions),
        "streamReady": bool(STREAM_API_KEY and STREAM_API_SECRET),
    }


# ─── Stream Video token endpoint ─────────────────────────────────────────────

class StreamTokenRequest(BaseModel):
    user_id: Optional[str] = None   # optional — auto-generated if omitted

# Simple in-memory rate limiter: 20 tokens / 60 s per IP
_token_rate: Dict[str, Deque[float]] = collections.defaultdict(collections.deque)
_TOKEN_RATE_LIMIT = 20
_TOKEN_RATE_WINDOW = 60.0   # seconds

def _check_rate_limit(client_ip: str) -> bool:
    """Return True if the request is allowed, False if rate-limited."""
    now = time.time()
    q: Deque[float] = _token_rate[client_ip]
    # Evict old timestamps outside the window
    while q and now - q[0] > _TOKEN_RATE_WINDOW:
        q.popleft()
    if len(q) >= _TOKEN_RATE_LIMIT:
        return False
    q.append(now)
    return True

@app.post("/api/stream/token")
async def stream_token(req: StreamTokenRequest, request: Request):
    """
    Mint a Stream Video user token.

    Requires STREAM_API_KEY and STREAM_API_SECRET in the environment.
    Returns { apiKey, userId, token } so the frontend can initialise
    StreamVideoClient without exposing the secret.
    Rate-limited to 20 requests / 60 s per IP.
    """
    client_ip = request.client.host if request.client else "unknown"
    if not _check_rate_limit(client_ip):
        raise HTTPException(
            status_code=429,
            detail="Too many token requests. Please wait a moment.",
        )

    if not STREAM_API_KEY or not STREAM_API_SECRET:
        raise HTTPException(
            status_code=503,
            detail="Stream credentials not configured. Set STREAM_API_KEY and STREAM_API_SECRET in .env",
        )

    user_id = req.user_id or f"livescene-{uuid.uuid4().hex[:8]}"

    if not _HAS_JWT:
        raise HTTPException(status_code=500, detail="PyJWT not installed. Run: pip install PyJWT")

    iat = int(time.time())
    payload = {
        "user_id": user_id,
        "iss": "stream-video-go",
        "sub": f"user/{user_id}",
        "iat": iat,
        "exp": iat + 3600,          # 1-hour expiry
    }
    token = _jwt.encode(payload, STREAM_API_SECRET, algorithm="HS256")

    return {
        "apiKey": STREAM_API_KEY,
        "userId": user_id,
        "token": token,
    }


@app.post("/api/detect")
async def detect(req: DetectRequest):
    """Fast single-frame detection — YOLO only, no LLM."""
    try:
        img = decode_frame(req.frame)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Bad frame: {e}")

    t0 = time.perf_counter()
    objects = await asyncio.to_thread(run_yolo, img)
    elapsed_ms = (time.perf_counter() - t0) * 1000

    # Update memory if session provided
    events = []
    if req.session_id:
        mem = get_or_create_memory(req.session_id)
        new_events = mem.update(objects)
        events = [e.to_dict() for e in new_events]

    return {
        "objects": objects,
        "events": events,
        "objectCount": len(objects),
        "inferenceMs": round(elapsed_ms, 1),
        "timestamp": req.timestamp or int(time.time() * 1000),
    }


@app.post("/api/analyze")
async def analyze(req: AnalyzeRequest):
    """Full pipeline: YOLO → Memory → LLM narration (+ optional Moondream)."""
    try:
        img = decode_frame(req.frame)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Bad frame: {e}")

    session_id = req.session_id or "default"
    t0 = time.perf_counter()

    # 1. YOLO detection
    objects = await asyncio.to_thread(run_yolo, img)

    # 2. Memory update
    mem = get_or_create_memory(session_id)
    new_events = mem.update(objects)
    memory_summary = mem.get_context_summary()
    events_for_llm = [e.to_dict() for e in new_events]

    # 3. LLM narration (async)
    # Strip prefix if needed for LLM vision call
    frame_b64 = req.frame.split(",", 1)[-1] if "," in req.frame else req.frame

    narration_task = narrator.narrate(
        objects=objects,
        memory_summary=memory_summary,
        events=events_for_llm,
        frame_b64=frame_b64,
    ) if narrator else None

    # 4. Optional Moondream Q&A (runs in parallel with LLM)
    moondream_task = None
    if req.include_moondream and moondream:
        moondream_task = moondream.describe_scene(frame_b64)

    # Await both
    narration_result = await narration_task if narration_task else None
    moondream_result = await moondream_task if moondream_task else {}

    elapsed_ms = (time.perf_counter() - t0) * 1000

    response: dict[str, Any] = {
        "objects": objects,
        "objectCount": len(objects),
        "events": events_for_llm,
        "memorySummary": memory_summary,
        "memorySnapshot": mem.get_snapshot(),
        "inferenceMs": round(elapsed_ms, 1),
        "timestamp": req.timestamp or int(time.time() * 1000),
    }

    if narration_result:
        response.update({
            "narration": narration_result.narration,
            "sceneDescription": narration_result.scene_description,
            "insights": narration_result.insights,
            "confidence": narration_result.confidence,
            "llmProvider": narration_result.provider,
        })
    else:
        response.update({
            "narration": "",
            "sceneDescription": "",
            "insights": [],
            "confidence": 0,
            "llmProvider": "none",
        })

    if moondream_result:
        response["moondreamAnswers"] = moondream_result

    return response


@app.post("/api/moondream")
async def moondream_query(req: MoondreamRequest):
    """Direct Moondream visual Q&A."""
    if not moondream:
        raise HTTPException(status_code=503, detail="Moondream not initialized")

    frame_b64 = req.frame.split(",", 1)[-1] if "," in req.frame else req.frame

    if not moondream.is_ready:
        if not moondream.load():
            raise HTTPException(status_code=503, detail="Moondream model could not be loaded")

    answers = await moondream.describe_scene(frame_b64, req.questions)
    return {"answers": answers}


@app.delete("/api/session/{session_id}")
async def clear_session(session_id: str):
    if session_id in session_memory:
        session_memory[session_id].reset()
        return {"cleared": True}
    return {"cleared": False}


class AskRequest(BaseModel):
    question: str
    objects: Optional[List[dict]] = None   # current YOLO detections (from frontend state)
    session_id: Optional[str] = "default"


class SaveSessionRequest(BaseModel):
    session_id: Optional[str] = None
    start_time: int
    end_time: int
    duration_ms: int
    total_objects: int
    unique_labels: List[str]
    label_counts: Optional[Dict[str, int]] = None
    narrations: Optional[List[dict]] = None
    activities: Optional[List[dict]] = None


@app.post("/api/ask")
async def ask(req: AskRequest):
    """
    Voice Q&A endpoint.
    Accepts a natural-language question + the current list of detected objects,
    forwards it to Gemini, and returns an answer string.
    """
    if not narrator or not narrator.is_ready:
        return {"answer": "The AI narrator is not ready yet. Please try again in a moment."}

    # Build a scene context string from the supplied objects
    if req.objects:
        label_counts: dict[str, int] = {}
        for obj in req.objects:
            lbl = obj.get("label", "unknown")
            label_counts[lbl] = label_counts.get(lbl, 0) + 1
        parts = [
            f"{cnt} {lbl}{'s' if cnt > 1 else ''}" for lbl, cnt in label_counts.items()
        ]
        scene_context = "Currently visible in the scene: " + ", ".join(parts) + "."
    else:
        scene_context = "The scene is currently empty or no detections are available."

    prompt = (
        f"You are an AI scene analyst. Answer the following question about a live camera feed.\n\n"
        f"Scene context: {scene_context}\n\n"
        f"Question: {req.question}\n\n"
        f"Answer concisely in 1–2 sentences."
    )

    try:
        answer = await narrator.ask(prompt)
    except Exception as e:
        logger.error("❌ /api/ask error: %s", e)
        answer = "Sorry, I could not process that question right now."

    logger.info("🎙️  Voice Q&A  Q: %r  A: %r", req.question, answer)
    return {"answer": answer, "sceneContext": scene_context}


# ─── Session persistence endpoints ───────────────────────────────────────────

@app.post("/api/sessions/save")
async def save_session(req: SaveSessionRequest):
    """Frontend saves a completed session to the server-side list."""
    record: Dict[str, Any] = {
        "id":           req.session_id or f"session-{int(time.time() * 1000)}",
        "startTime":    req.start_time,
        "endTime":      req.end_time,
        "durationMs":   req.duration_ms,
        "totalObjects": req.total_objects,
        "uniqueLabels": req.unique_labels,
        "labelCounts":  req.label_counts or {},
        "narrations":   req.narrations or [],
        "activities":   req.activities or [],
    }
    # Prevent duplicates by id
    completed_sessions[:] = [s for s in completed_sessions if s["id"] != record["id"]]
    completed_sessions.append(record)
    # Keep last 50 sessions
    if len(completed_sessions) > 50:
        completed_sessions.pop(0)
    logger.info("💾 Session saved: %s  (%d objects, %.1fs)", record["id"], record["totalObjects"], record["durationMs"] / 1000)
    return {"saved": True, "id": record["id"]}


@app.get("/api/sessions")
async def list_sessions():
    """Return all saved sessions, newest first."""
    return {"sessions": list(reversed(completed_sessions))}


@app.get("/api/sessions/{session_id}")
async def get_session(session_id: str):
    for s in completed_sessions:
        if s["id"] == session_id:
            return s
    raise HTTPException(status_code=404, detail="Session not found")


@app.delete("/api/sessions/{session_id}")
async def delete_session(session_id: str):
    before = len(completed_sessions)
    completed_sessions[:] = [s for s in completed_sessions if s["id"] != session_id]
    deleted = len(completed_sessions) < before
    if not deleted:
        raise HTTPException(status_code=404, detail="Session not found")
    logger.info("🗑️  Session deleted: %s", session_id)
    return {"deleted": True}


@app.delete("/api/sessions")
async def clear_all_sessions():
    completed_sessions.clear()
    logger.info("🗑️  All sessions cleared")
    return {"cleared": True}




@app.websocket("/ws/stream")
async def websocket_stream(websocket: WebSocket):
    """
    Real-time bidirectional stream.

    Client sends:
        { "type": "frame", "frame": "<base64 jpeg>", "sessionId": "...", "includeLLM": true }
        { "type": "ping" }
        { "type": "reset", "sessionId": "..." }

    Server pushes:
        { "type": "detection",  "objects": [...], "events": [...], "timestamp": ... }
        { "type": "narration",  "narration": "...", "sceneDescription": "...", "insights": [...], "provider": "..." }
        { "type": "status",     "yoloReady": true, "llmReady": true, ... }
        { "type": "pong" }
        { "type": "error",      "message": "..." }
    """
    # ── Origin check ────────────────────────────────────────────────────────
    origin = (websocket.headers.get("origin") or "").rstrip("/")
    allowed_raw = os.getenv("CORS_ORIGINS", "http://localhost:3000,http://localhost:3001")
    allowed_origins = {o.strip().rstrip("/") for o in allowed_raw.split(",") if o.strip()}
    if origin and origin not in allowed_origins:
        logger.warning("WS rejected — origin %s not in %s", origin, allowed_origins)
        await websocket.close(code=1008)
        return

    await websocket.accept()
    ws_clients.add(websocket)
    session_id = "ws-" + str(uuid.uuid4())[:8]

    logger.info("WS connected — session %s  (total: %d)", session_id, len(ws_clients))

    # Send initial status
    await websocket.send_json({
        "type": "status",
        "yoloReady": yolo_model is not None,
        "llmReady": narrator is not None and narrator.is_ready,
        "llmProvider": narrator.provider_name if narrator else "none",
        "sessionId": session_id,
    })

    # LLM narration runs less frequently than YOLO (every N frames)
    NARRATE_EVERY_N = 3
    frame_counter = 0
    last_narration_task: Optional[asyncio.Task] = None
    session_label_counts: Dict[str, int] = {}
    session_start_ts = int(time.time() * 1000)

    try:
        while True:
            raw = await websocket.receive_text()
            msg = json.loads(raw)
            msg_type = msg.get("type", "frame")

            # ── Ping ──────────────────────────────────────────────────────────
            if msg_type == "ping":
                await websocket.send_json({"type": "pong"})
                continue

            # ── Reset session memory ──────────────────────────────────────────
            if msg_type == "reset":
                sid = msg.get("sessionId", session_id)
                if sid in session_memory:
                    session_memory[sid].reset()
                await websocket.send_json({"type": "reset_ack", "sessionId": sid})
                continue

            # ── Frame ─────────────────────────────────────────────────────────
            if msg_type != "frame":
                continue

            frame_b64_raw = msg.get("frame", "")
            if not frame_b64_raw:
                continue

            frame_b64 = frame_b64_raw.split(",", 1)[-1] if "," in frame_b64_raw else frame_b64_raw
            client_session = msg.get("sessionId", session_id)
            include_llm    = msg.get("includeLLM", True)
            # Per-frame confidence override (sent from frontend slider)
            frame_conf = msg.get("conf", None)
            frame_counter += 1

            try:
                img = await asyncio.to_thread(
                    lambda: decode_frame(frame_b64_raw)
                )
            except Exception as e:
                await websocket.send_json({"type": "error", "message": f"Bad frame: {e}"})
                continue

            # Run YOLO (with optional per-frame confidence override from slider)
            try:
                objects = await asyncio.to_thread(run_yolo, img, frame_conf)
            except Exception as e:
                await websocket.send_json({"type": "error", "message": f"YOLO error: {e}"})
                continue

            # Memory update
            mem = get_or_create_memory(client_session)
            new_events = mem.update(objects)
            events_payload = [e.to_dict() for e in new_events]

            # Track label frequencies for this WS session
            for obj in objects:
                lbl = obj.get("label", "unknown")
                session_label_counts[lbl] = session_label_counts.get(lbl, 0) + 1

            # Push detection result immediately (low latency)
            await websocket.send_json({
                "type":        "detection",
                "objects":     objects,
                "events":      events_payload,
                "objectCount": len(objects),
                "labelCounts": session_label_counts,
                "timestamp":   int(time.time() * 1000),
            })

            # Run LLM narration every N frames (doesn't block detection)
            should_narrate = include_llm and narrator and (frame_counter % NARRATE_EVERY_N == 0)
            if should_narrate:
                try:
                    memory_summary = mem.get_context_summary()
                    narration_result = await narrator.narrate(
                        objects=objects,
                        memory_summary=memory_summary,
                        events=events_payload,
                        frame_b64=frame_b64,
                    )
                    await websocket.send_json({
                        "type":             "narration",
                        "narration":        narration_result.narration,
                        "sceneDescription": narration_result.scene_description,
                        "insights":         narration_result.insights,
                        "provider":         narration_result.provider,
                        "confidence":       narration_result.confidence,
                        "timestamp":        int(time.time() * 1000),
                    })
                except Exception as e:
                    logger.warning("WS narration error: %s", e)

    except WebSocketDisconnect:
        logger.info("WS disconnected — session %s", session_id)
    except Exception as e:
        logger.error("WS error: %s", e)
    finally:
        ws_clients.discard(websocket)
        # Clean up session memory if no clients are active
        if client_session in session_memory and not ws_clients:
            pass  # keep memory for potential reconnect


# ─── Entry point ─────────────────────────────────────────────────────────────

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        app,                          # pass the app object directly — no subprocess spawning
        host=os.getenv("HOST", "0.0.0.0"),
        port=int(os.getenv("PORT", "5000")),
        reload=False,                 # reload=True causes subprocess spawn issues on Python 3.14
        log_level="info",
    )
