import React, { useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Eye,
  EyeOff,
  Play,
  Square,
  Layers,
  AlertTriangle,
  Rss,
} from "lucide-react";
import { ActivityEvent, ActivityEventType } from "../../types";
import { formatEventTime } from "../../services/sceneService";

interface ActivityFeedProps {
  activities?: ActivityEvent[];
  maxVisible?: number;
}

const eventIcons: Record<ActivityEventType, React.ElementType> = {
  object_appeared: Eye,
  object_disappeared: EyeOff,
  scene_empty: Layers,
  scene_changed: Rss,
  new_narration: Rss,
  session_start: Play,
  session_stop: Square,
};

const eventColors: Record<ActivityEventType, string> = {
  object_appeared: "text-neon-green  bg-neon-green/10  border-neon-green/20",
  object_disappeared: "text-white/40    bg-white/5        border-white/10",
  scene_empty: "text-neon-orange bg-neon-orange/10 border-neon-orange/20",
  scene_changed: "text-neon-cyan   bg-neon-cyan/10   border-neon-cyan/20",
  new_narration: "text-brand       bg-brand/10       border-brand/20",
  session_start: "text-neon-green  bg-neon-green/10  border-neon-green/20",
  session_stop: "text-neon-red    bg-neon-red/10    border-neon-red/20",
};

const ActivityFeed: React.FC<ActivityFeedProps> = ({
  activities = [],
  maxVisible = 50,
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = 0;
    }
  }, [activities.length]);

  const visible = activities.slice(0, maxVisible);

  return (
    <div className="flex flex-col h-full rounded-2xl border border-white/8 bg-dark-700/80 backdrop-blur-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/8">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-neon-orange animate-pulse" />
          <span className="text-sm font-semibold text-white">Activity Log</span>
        </div>
        <span className="text-xs font-mono text-white/30">
          {activities.length} events
        </span>
      </div>

      {/* Feed */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-3 py-2 flex flex-col gap-1.5 min-h-0"
      >
        <AnimatePresence initial={false}>
          {visible.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full py-8 gap-2">
              <AlertTriangle size={22} className="text-white/15" />
              <p className="text-white/25 text-xs">No activity yet</p>
            </div>
          ) : (
            visible.map((event) => {
              const Icon = eventIcons[event.type] ?? Rss;
              const colorClass =
                eventColors[event.type] ??
                "text-white/40 bg-white/5 border-white/10";

              return (
                <motion.div
                  key={event.id}
                  initial={{ opacity: 0, x: -12, height: 0 }}
                  animate={{ opacity: 1, x: 0, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.25, ease: "easeOut" }}
                  className="flex items-start gap-2.5 py-1.5"
                >
                  {/* Icon */}
                  <div
                    className={`flex-shrink-0 w-6 h-6 rounded-lg border flex items-center justify-center ${colorClass}`}
                  >
                    <Icon size={11} />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-white/75 leading-snug truncate">
                      {event.description}
                    </p>
                    <span className="text-xs text-white/25 font-mono">
                      {formatEventTime(event.timestamp)}
                    </span>
                  </div>
                </motion.div>
              );
            })
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default React.memo(ActivityFeed);
