import React, { useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageSquare, Volume2, VolumeX, Sparkles, Mic } from "lucide-react";
import { NarrationEntry } from "../../types";
import { formatEventTime } from "../../services/sceneService";

interface NarratorPanelProps {
  currentNarration?: string;
  narrations?: NarrationEntry[];
  isSpeaking?: boolean;
  isActive?: boolean;
  onToggleVoice?: () => void;
}

const typeColors: Record<string, string> = {
  narration: "text-white",
  insight: "text-neon-cyan",
  alert: "text-neon-red",
  system: "text-white/40",
  voice: "text-neon-purple",
};

const NarratorPanel: React.FC<NarratorPanelProps> = ({
  currentNarration = "Waiting for scene...",
  narrations = [],
  isSpeaking = false,
  isActive = false,
  onToggleVoice,
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop =
        scrollRef.current.scrollTop === 0 ? 0 : scrollRef.current.scrollHeight;
    }
  }, [narrations]);

  return (
    <div className="flex flex-col h-full rounded-2xl border border-white/8 bg-dark-700/80 backdrop-blur-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/8">
        <div className="flex items-center gap-2">
          <div
            className={`w-2 h-2 rounded-full ${isActive ? "bg-brand animate-pulse" : "bg-white/20"}`}
          />
          <span className="text-sm font-semibold text-white">
            Scene Narrator
          </span>
        </div>
        <button
          onClick={onToggleVoice}
          className="p-1.5 rounded-lg text-white/40 hover:text-white hover:bg-white/8 transition-colors"
          title="Toggle voice"
        >
          {isSpeaking ? (
            <Volume2 size={15} className="text-brand" />
          ) : (
            <VolumeX size={15} />
          )}
        </button>
      </div>

      {/* Current narration */}
      <div className="px-4 py-4 border-b border-white/8">
        <div className="flex items-start gap-2.5">
          <div className="mt-1 flex-shrink-0 w-6 h-6 rounded-lg bg-brand/15 border border-brand/30 flex items-center justify-center">
            <Sparkles size={12} className="text-brand" />
          </div>
          <AnimatePresence mode="wait">
            <motion.p
              key={currentNarration}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.3 }}
              className="text-sm text-white leading-relaxed font-medium"
            >
              {currentNarration}
            </motion.p>
          </AnimatePresence>
        </div>

        {/* Speaking wave */}
        {isSpeaking && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex items-center gap-0.5 mt-2 ml-8"
          >
            {[1, 2, 3, 4, 5].map((i) => (
              <motion.div
                key={i}
                className="w-0.5 bg-brand rounded-full"
                animate={{ height: ["4px", "12px", "4px"] }}
                transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.1 }}
              />
            ))}
          </motion.div>
        )}
      </div>

      {/* Narration history */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-4 py-3 flex flex-col gap-2 min-h-0"
      >
        {narrations.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-2 text-center py-6">
            <MessageSquare size={24} className="text-white/15" />
            <p className="text-white/25 text-xs">Narrations will appear here</p>
          </div>
        ) : (
          narrations.map((entry, idx) => (
            <motion.div
              key={entry.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx === 0 ? 0 : 0 }}
              className="flex items-start gap-2.5 group"
            >
              <span className="text-xs text-white/25 font-mono mt-0.5 flex-shrink-0 w-16">
                {formatEventTime(entry.timestamp)}
              </span>
              {entry.type === "voice" && (
                <Mic
                  size={10}
                  className="text-neon-purple mt-1 flex-shrink-0"
                />
              )}
              <p
                className={`text-xs leading-relaxed ${
                  entry.type === "voice"
                    ? "text-neon-purple/80 italic"
                    : typeColors[entry.type] || "text-white/60"
                }`}
              >
                {entry.type === "voice" ? `🎙️ ${entry.text}` : entry.text}
              </p>
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
};

export default React.memo(NarratorPanel);
