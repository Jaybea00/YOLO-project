# LiveScene AI — Python Backend

Real-time YOLO + LLM + Moondream pipeline powering the LiveScene AI frontend.

## Stack

| Component        | Library                                    |
| ---------------- | ------------------------------------------ |
| API server       | FastAPI + Uvicorn                          |
| Object detection | YOLOv8 (Ultralytics)                       |
| Scene narration  | Gemini 1.5 Flash / GPT-4o-mini             |
| Visual Q&A       | Moondream2                                 |
| Transport        | WebSocket (`/ws/stream`) + REST (`/api/*`) |
| Memory           | In-process per-session tracking            |

---

## Quick Start

### 1. Prerequisites

- Python 3.10+
- (Optional) CUDA GPU for faster YOLO inference

### 2. Create a virtual environment

```powershell
cd livescene-ai\backend
python -m venv .venv
.venv\Scripts\activate
```

### 3. Install dependencies

```powershell
pip install -r requirements.txt
```

> First run downloads `yolov8n.pt` (~6 MB) automatically.  
> Moondream downloads ~1.7 GB on first local use — use the cloud API to skip this.

### 4. Configure environment

```powershell
copy .env.example .env
# Edit .env and add your API keys
```

Minimum required — at least one LLM key:

```env
GEMINI_API_KEY=your_key_here   # free tier available at aistudio.google.com
```

### 5. Start the server

```powershell
python main.py
```

Or with uvicorn directly:

```powershell
uvicorn main:app --host 0.0.0.0 --port 5000 --reload
```

Server starts at `http://localhost:5000`

---

## Enable Real Backend in Frontend

In `livescene-ai/.env.local`:

```env
VITE_MOCK_BACKEND=false
VITE_API_URL=http://localhost:5000
VITE_WS_URL=ws://localhost:5000/ws/stream
```

Then restart the Vite dev server.

---

## API Reference

### `GET /api/status`

Returns model readiness and connection info.

```json
{
  "connected": true,
  "yoloReady": true,
  "llmReady": true,
  "llmProvider": "gemini",
  "yoloModel": "yolov8n.pt"
}
```

### `POST /api/detect`

Fast YOLO-only detection. Body: `{ "frame": "<base64 JPEG>", "session_id": "..." }`

### `POST /api/analyze`

Full pipeline: YOLO + Memory + LLM narration.  
Body: `{ "frame": "...", "session_id": "...", "include_moondream": false }`

### `WS /ws/stream`

Real-time bidirectional stream.

**Send frame:**

```json
{ "type": "frame", "frame": "<base64>", "sessionId": "...", "includeLLM": true }
```

**Receive detection:**

```json
{ "type": "detection", "objects": [...], "events": [...], "objectCount": 3 }
```

**Receive narration:**

```json
{ "type": "narration", "narration": "A person is using a laptop.", "insights": [...], "provider": "gemini" }
```

---

## YOLO Model Options

| Model        | Size  | Speed      | Accuracy  |
| ------------ | ----- | ---------- | --------- |
| `yolov8n.pt` | 6 MB  | ⚡ Fastest | Good      |
| `yolov8s.pt` | 22 MB | Fast       | Better    |
| `yolov8m.pt` | 52 MB | Medium     | Great     |
| `yolov8l.pt` | 87 MB | Slow       | Excellent |

Set in `.env`: `YOLO_MODEL=yolov8n.pt`
