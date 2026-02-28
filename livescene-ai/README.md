# LiveScene AI

LiveScene AI is a real-time scene narrator and activity analyzer that leverages advanced AI technologies to provide insights and narration for various scenes. This project aims to create an intuitive and modern interface for users to interact with scene analysis and narration features.

## Features

- **Real-Time Scene Analysis**: Analyze scenes in real-time and receive instant feedback.
- **Narration Panel**: View narrated descriptions of the scene with controls for interaction.
- **Activity Feed**: Monitor activities detected in the scene with a detailed feed.
- **Dashboard**: FPS sparkline + top-5 object bar chart with live label counts.
- **Customizable UI**: A clean and modern frontend built with React and styled using Tailwind CSS.

### Stream Video SDK Integration

LiveScene AI uses the **[Stream Video React SDK](https://getstream.io/video/docs/react/)** as its camera transport layer.

| Component          | Detail                                                                                                                                |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------- |
| **SDK**            | `@stream-io/video-react-sdk`                                                                                                          |
| **Token endpoint** | `POST /api/stream/token` → returns `{apiKey, userId, token}` signed with HMAC-SHA256 (PyJWT)                                          |
| **StreamCamera**   | `src/components/narrator/StreamCamera.tsx` — wraps `<VideoPreview>` inside `StreamVideo` + `StreamCall` providers; lazily loaded      |
| **useStreamVideo** | `src/hooks/useStreamVideo.ts` — manages `StreamVideoClient` lifecycle, `call.join()`, and a `captureFrame()` helper for YOLO analysis |
| **Toggle**         | 📶 **Stream** button in Analyze toolbar — switches between local webcam and Stream transport in one click                             |
| **Badge**          | "Powered by Stream" badge displayed when Stream mode is active (required for hackathon)                                               |

**Setup:**

1. Create a free app at [dashboard.getstream.io](https://dashboard.getstream.io)
2. Copy your **API Key** and **Secret** into `backend/.env`:
   ```
   STREAM_API_KEY=your_key
   STREAM_API_SECRET=your_secret
   ```
3. Click the 📶 **Stream** button in the Analyze view

| Feature                          | Description                                                                                                                                                                                             |
| -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Scene Heatmap**                | Toggle a thermal heatmap overlay (🔥 Heat button) in the Analyze view. Accumulates bbox centre positions over time into a 64 × 36 grid with per-frame decay, colour-ramped blue → green → yellow → red. |
| **Dwell-Time Tracker**           | `DwellPanel` component tracks how long each detected class has been continuously visible and renders an animated bar table with colour-coded timers (green → red).                                      |
| **Real Label Counts in History** | Session history bar charts now show actual detection frequency per class instead of a flat `count: 1`. `labelCounts` is saved to `localStorage` via `sceneService.saveSession`.                         |
| **Sound Alerts**                 | `useSoundAlert` hook — zero audio files needed. Web Audio API oscillators provide a blip on session start, a chime on alert/goal-met, and a descending tone on session stop.                            |
| **Home Live Stats Ticker**       | The Home page probes `GET /api/status` on load and shows backend online/offline status, server session count, and local-storage session count as animated chip badges below the CTA buttons.            |

## Getting Started

### Prerequisites

- Node.js (version 14 or higher)
- npm (Node Package Manager)

### Installation

1. Clone the repository:
   ```
   git clone https://github.com/yourusername/livescene-ai.git
   ```
2. Navigate to the project directory:
   ```
   cd livescene-ai
   ```
3. Install the dependencies:
   ```
   npm install
   ```

### Running the Application

To start the development server, run:

```
npm run dev
```

Open your browser and navigate to `http://localhost:3000` to view the application.

### Building for Production

To build the application for production, run:

```
npm run build
```

The production files will be generated in the `dist` directory.

## Contributing

Contributions are welcome! Please open an issue or submit a pull request for any enhancements or bug fixes.

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.

## Acknowledgments

- Thanks to the contributors and the open-source community for their support and resources.
