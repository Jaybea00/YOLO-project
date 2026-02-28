# 🎬 LiveScene AI — Real-Time Scene Narrator & Activity Analyzer

> An AI agent that **watches**, **remembers**, and **understands** your world in real time.  
> Built for the **Stream Video SDK Hackathon** · YOLO + Gemini + Stream · WebSocket streaming

[![Stream](https://img.shields.io/badge/Video-Stream%20SDK-005fff?style=flat-square&logo=stream)](https://getstream.io)
[![YOLOv8s](https://img.shields.io/badge/detection-YOLOv8s-6e56cf?style=flat-square)](https://github.com/ultralytics/ultralytics)
[![Gemini](https://img.shields.io/badge/LLM-Gemini%202.0%20Flash-00bfa5?style=flat-square)](https://ai.google.dev)
[![FastAPI](https://img.shields.io/badge/backend-FastAPI-009688?style=flat-square)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/frontend-React%2018-61dafb?style=flat-square)](https://react.dev)
[![License: MIT](https://img.shields.io/badge/license-MIT-yellow?style=flat-square)](LICENSE)

---

## 📽️ Demo

https://github.com/Jaybea00/YOLO-project/raw/master/livescene-ai/demo.mp4

> _Full walkthrough: webcam detection → Gemini narration → alerts → Stream Video SDK mode_  
> Video file: [`livescene-ai/demo.mp4`](livescene-ai/demo.mp4)

---

## ✨ What It Does

LiveScene AI streams your webcam (or a **Stream Video SDK** room) through a multi-stage AI pipeline every 500 ms:

1. **Stream Video SDK** — encrypted P2P video transport; flip the Wifi icon to switch from local webcam to a live Stream call
2. **YOLOv8s** — detects objects with bounding boxes (80 COCO classes, conf ≥ 0.20)
3. **Memory Engine** — tracks which objects appeared / disappeared / changed count
4. **Gemini 2.0 Flash** — narrates the scene in natural language every 3rd frame
5. **Agent Goals** — watch for custom conditions and fire audio + visual alerts
6. **Scene Heatmap** — shows where objects have been detected across the last 30 frames
7. **Dwell Tracker** — shows how long each object class has been visible in seconds
8. Every session is saved to local history with per-session analytics charts

---

## ��️ Architecture

```
Webcam / Stream Video SDK (browser)
    │  Base-64 JPEG @ 500 ms via WebSocket
    ▼
FastAPI  (/ws/stream)
    ├─► YOLOv8s ──► Scene Memory ──► object_appeared / disappeared / changed
    └─► Gemini 2.0 Flash (every 3rd frame) ──► narration string
    ▼
WebSocket response → React 18 Frontend
    ├─ SceneViewer      live canvas + bounding boxes + heatmap
    ├─ NarratorPanel    narration stream + voice synthesis
    ├─ AlertPanel       goals manager with real-time matching
    ├─ DwellPanel       per-class dwell timer
    ├─ PresetBar        Security / Workspace / Activity modes
    ├─ StreamCamera     Stream Video SDK preview
    ├─ Dashboard        live area chart + stats cards
    └─ History          session replay + per-session chart + JSON export
```

---

## 🛠️ Tech Stack

| Layer            | Technology                       | Purpose                              |
| ---------------- | -------------------------------- | ------------------------------------ |
| Video SDK        | Stream Video React SDK           | Encrypted P2P webcam transport       |
| Object Detection | YOLOv8s (Ultralytics)            | 80-class real-time detection         |
| Scene Reasoning  | Gemini 2.0 Flash                 | Contextual narration                 |
| Backend          | FastAPI 0.110 + uvicorn          | WebSocket server, REST API           |
| Scene Memory     | Custom `memory.py`               | Tracks object state across frames    |
| Token Auth       | PyJWT (HMAC-SHA256)              | Mints Stream user tokens server-side |
| Frontend         | React 18 + Vite 5 + TypeScript   | SPA                                  |
| Styling          | Tailwind CSS + custom neon theme | Dark UI                              |
| Animation        | framer-motion                    | Spring counters, transitions         |
| Charts           | recharts 2.12                    | Activity timeline                    |
| Realtime         | WebSocket (native browser API)   | Bidirectional frame streaming        |

---

## 🚀 Quick Start

```bat
git clone https://github.com/Jaybea00/YOLO-project.git
cd YOLO-project
setup.bat
```

`setup.bat` installs all dependencies, starts the backend on **:5000** and frontend on **:3000**, and opens your browser automatically.

> **First run:** open `livescene-ai/backend/.env` and add your `GEMINI_API_KEY`.  
> Free key → <https://aistudio.google.com/app/apikey>

### Manual Setup

```bash
# Backend (port 5000)
cd livescene-ai/backend
pip install -r requirements.txt
cp .env.example .env   # add GEMINI_API_KEY + STREAM_API_KEY / STREAM_API_SECRET
python run.py

# Frontend (port 3000)
cd livescene-ai
npm install
npm run dev
```

---

## 🎯 Demo Scenarios

| Scenario           | Steps                                                                         |
| ------------------ | ----------------------------------------------------------------------------- |
| **Security Mode**  | Analyze → Security Mode preset → walk in frame → alert fires + heatmap builds |
| **Stream Video**   | Click Wifi icon → Stream call joins → YOLO runs on the Stream video track     |
| **Workspace Mode** | Workspace preset → sit at desk → Dwell Panel shows per-object time            |
| **Custom Goal**    | Type _"Alert me if a person and cell phone are in the scene"_ → hold up phone |

After any session: **History** → per-object bar chart → **Export JSON**

---

## ⚙️ Configuration

| Setting              | Location                            | Default  |
| -------------------- | ----------------------------------- | -------- |
| Confidence threshold | Analyze toolbar slider              | 0.20     |
| Object class filter  | Analyze filter chips                | All on   |
| Narration frequency  | `backend/main.py` `NARRATE_EVERY_N` | 3 frames |
| Frame interval       | `src/hooks/useSceneAnalysis.ts`     | 500 ms   |
| Alert cooldown       | `src/hooks/useAlert.ts`             | 5 000 ms |

---

## 📁 Project Structure

```
livescene-ai/
├── backend/
│   ├── main.py          # FastAPI + WebSocket /ws/stream + Stream token endpoint
│   ├── memory.py        # Scene state + object tracking
│   ├── llm.py           # Gemini 2.0 Flash integration
│   ├── moondream.py     # Visual Q&A layer (optional)
│   ├── run.py           # Production launcher
│   └── requirements.txt
└── src/
    ├── pages/
    │   ├── Home.tsx     # Landing page with live stats ticker
    │   ├── Analyze.tsx  # Main analyzer (camera, detection, alerts, heatmap)
    │   └── History.tsx  # Session history + charts + JSON export
    ├── components/
    │   ├── narrator/    # SceneViewer, NarratorPanel, AlertPanel, DwellPanel,
    │   │                #   PresetBar, StreamCamera, MicBar, ActivityFeed
    │   ├── dashboard/   # Dashboard, StatsCard, Timeline
    │   └── common/      # Button, Card, Modal, LoadingSpinner, SettingsModal,
    │                    #   DemoWalkthrough, HelpModal
    ├── hooks/
    │   ├── useSceneAnalysis.ts  # WebSocket + YOLO state
    │   ├── useStreamVideo.ts    # Stream Video SDK lifecycle
    │   ├── useAlert.ts          # Goals + alert matching
    │   ├── useSoundAlert.ts     # Web Audio API sound effects
    │   └── useNarrator.ts       # Narration + voice synthesis
    └── services/
        ├── api.ts               # REST helpers + /api/stream/token
        └── sceneService.ts      # Session save/load (localStorage)
```

---

## 🤝 Credits

- [Stream Video React SDK](https://getstream.io/video/sdk/react/) — video transport
- [Ultralytics YOLOv8](https://github.com/ultralytics/ultralytics) — object detection
- [Google Gemini API](https://ai.google.dev) — scene narration
- [FastAPI](https://fastapi.tiangolo.com) — async backend
- [Vite](https://vitejs.dev) + [React](https://react.dev) — frontend
- [framer-motion](https://www.framer.com/motion/) — animations
- [recharts](https://recharts.org) — charts
