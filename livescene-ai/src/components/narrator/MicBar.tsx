import React, { useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Mic, MicOff, AlertCircle } from "lucide-react";

interface MicBarProps {
  isListening: boolean;
  isSupported: boolean;
  micLevel: number; // 0–1
  transcript: string;
  error: string | null;
  onToggle: () => void;
  disabled?: boolean;
}

// Number of animated bars in the waveform
const BAR_COUNT = 10;

const MicBar: React.FC<MicBarProps> = ({
  isListening,
  isSupported,
  micLevel,
  transcript,
  error,
  onToggle,
  disabled = false,
}) => {
  // Keep a small ring-buffer of recent mic levels to smooth the waveform
  const historyRef = useRef<number[]>(new Array(BAR_COUNT).fill(0));

  useEffect(() => {
    historyRef.current = [
      micLevel,
      ...historyRef.current.slice(0, BAR_COUNT - 1),
    ];
  }, [micLevel]);

  return (
    <div className="flex items-center gap-2">
      {/* Mic toggle button */}
      <motion.button
        onClick={onToggle}
        disabled={!isSupported || disabled}
        whileTap={{ scale: 0.9 }}
        title={
          !isSupported
            ? "Speech recognition not supported (use Chrome)"
            : isListening
              ? "Stop listening"
              : "Start voice control"
        }
        className={`
          relative flex items-center justify-center w-8 h-8 rounded-xl border transition-all
          ${
            isListening
              ? "bg-neon-red/15 border-neon-red/40 text-neon-red hover:bg-neon-red/25"
              : "bg-white/5 border-white/10 text-white/40 hover:border-white/20 hover:text-white/70"
          }
          ${!isSupported || disabled ? "opacity-30 cursor-not-allowed" : "cursor-pointer"}
        `}
      >
        {isListening ? <Mic size={14} /> : <MicOff size={14} />}

        {/* Pulse ring when listening */}
        {isListening && (
          <motion.span
            className="absolute inset-0 rounded-xl border border-neon-red/50"
            animate={{ scale: [1, 1.5], opacity: [0.6, 0] }}
            transition={{ duration: 1.2, repeat: Infinity, ease: "easeOut" }}
          />
        )}
      </motion.button>

      {/* Waveform bars — only shown while listening */}
      <AnimatePresence>
        {isListening && (
          <motion.div
            initial={{ opacity: 0, width: 0 }}
            animate={{ opacity: 1, width: "auto" }}
            exit={{ opacity: 0, width: 0 }}
            className="flex items-center gap-[2px] overflow-hidden"
          >
            {Array.from({ length: BAR_COUNT }).map((_, i) => {
              // Each bar reflects a slightly different time offset for wave feel
              const level = historyRef.current[i] ?? 0;
              const jitter = 0.15 + Math.sin(i * 1.3) * 0.1;
              const height = Math.max(
                3,
                Math.round((level + jitter * micLevel) * 20),
              );
              return (
                <motion.span
                  key={i}
                  animate={{ height }}
                  transition={{ type: "spring", stiffness: 300, damping: 20 }}
                  className="w-[3px] rounded-full bg-neon-red/70 flex-shrink-0"
                  style={{ height }}
                />
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Transcript / error text */}
      <AnimatePresence mode="wait">
        {error ? (
          <motion.span
            key="error"
            initial={{ opacity: 0, x: -4 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0 }}
            className="flex items-center gap-1 text-[11px] text-neon-orange/80 font-mono max-w-[160px] truncate"
          >
            <AlertCircle size={10} />
            {error}
          </motion.span>
        ) : isListening && transcript ? (
          <motion.span
            key={transcript}
            initial={{ opacity: 0, x: -4 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0 }}
            className="text-[11px] text-white/50 italic max-w-[180px] truncate font-mono"
          >
            "{transcript}"
          </motion.span>
        ) : isListening ? (
          <motion.span
            key="listening"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="text-[11px] text-neon-red/60 font-mono"
          >
            listening…
          </motion.span>
        ) : null}
      </AnimatePresence>
    </div>
  );
};

export default MicBar;
