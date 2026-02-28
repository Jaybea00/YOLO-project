/**
 * StreamCamera.tsx
 *
 * Replaces react-webcam when Stream mode is active.
 * Uses the Stream Video SDK's VideoPreview inside a wrapper that also
 * exposes a plain <video> ref so the parent canvas overlay can
 * capture frames for YOLO analysis.
 *
 * Props match the subset of react-webcam props that SceneViewer uses.
 */

import React, { useEffect, useRef } from "react";
import {
  StreamVideo,
  StreamCall,
  VideoPreview,
} from "@stream-io/video-react-sdk";
import "@stream-io/video-react-sdk/dist/css/styles.css";
import { StreamVideoClient, Call } from "@stream-io/video-react-sdk";
import { motion } from "framer-motion";
import { Wifi, WifiOff, Loader2 } from "lucide-react";

interface StreamCameraProps {
  client: StreamVideoClient;
  call: Call;
  /** Ref forwarded to the underlying <video> for frame capture */
  videoRef: React.RefObject<HTMLVideoElement>;
  isConnecting?: boolean;
  onReady?: () => void;
}

/**
 * Inner component that renders inside StreamVideo+StreamCall providers.
 * Grabs the first <video> element from VideoPreview and forwards it to videoRef.
 */
const InnerPreview: React.FC<{
  videoRef: React.RefObject<HTMLVideoElement>;
  onReady?: () => void;
}> = ({ videoRef, onReady }) => {
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Poll until the SDK mounts a <video> inside the wrapper, then forward its ref
    const id = setInterval(() => {
      const video =
        wrapperRef.current?.querySelector<HTMLVideoElement>("video");
      if (video) {
        // Assign to the forwarded ref (it may be a MutableRefObject)
        (videoRef as React.MutableRefObject<HTMLVideoElement | null>).current =
          video;
        clearInterval(id);
        onReady?.();
      }
    }, 100);
    return () => clearInterval(id);
  }, [videoRef, onReady]);

  return (
    <div
      ref={wrapperRef}
      className="w-full h-full [&_video]:w-full [&_video]:h-full [&_video]:object-cover"
    >
      <VideoPreview
        DisabledVideoPreview={() => (
          <div className="flex items-center justify-center w-full h-full bg-dark-800 text-white/30 text-sm gap-2">
            <WifiOff size={16} />
            Camera disabled
          </div>
        )}
        NoCameraPreview={() => (
          <div className="flex items-center justify-center w-full h-full bg-dark-800 text-white/30 text-sm gap-2">
            <WifiOff size={16} />
            No camera found
          </div>
        )}
      />
    </div>
  );
};

const StreamCamera: React.FC<StreamCameraProps> = ({
  client,
  call,
  videoRef,
  isConnecting = false,
  onReady,
}) => {
  if (isConnecting) {
    return (
      <div className="flex flex-col items-center justify-center w-full h-full bg-dark-800 gap-3 text-white/50">
        <Loader2 size={28} className="animate-spin text-brand" />
        <span className="text-sm">Connecting to Stream…</span>
      </div>
    );
  }

  return (
    <StreamVideo client={client}>
      <StreamCall call={call}>
        <InnerPreview videoRef={videoRef} onReady={onReady} />
      </StreamCall>

      {/* "Powered by Stream" badge — required for hackathon */}
      <motion.a
        href="https://getstream.io/video/"
        target="_blank"
        rel="noopener noreferrer"
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        className="absolute bottom-3 right-3 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-sm border border-white/10 text-[10px] text-white/60 hover:text-white/90 transition-colors z-20"
      >
        <Wifi size={9} className="text-brand" />
        Powered by Stream
      </motion.a>
    </StreamVideo>
  );
};

export default StreamCamera;
