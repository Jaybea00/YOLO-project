import React, { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Clock,
  Trash2,
  Eye,
  MessageSquare,
  Activity,
  Calendar,
  ChevronDown,
  ChevronUp,
  Database,
  Download,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { loadSessions, clearSessions } from "../services/sceneService";
import Button from "../components/common/Button";
import Card from "../components/common/Card";

interface Session {
  id: string;
  startTime: number;
  endTime: number;
  durationMs: number;
  totalObjects: number;
  uniqueLabels: string[];
  narrations: { id: string; text: string; timestamp: number }[];
  activities: { id: string; description: string; timestamp: number }[];
  labelCounts?: Record<string, number>;
}

function formatDuration(ms: number) {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  if (m > 0) return `${m}m ${s % 60}s`;
  return `${s}s`;
}

function formatDate(ts: number) {
  return new Date(ts).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const History: React.FC = () => {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    setSessions(loadSessions());
  }, []);

  const handleClear = () => {
    clearSessions();
    setSessions([]);
  };

  const toggleExpand = (id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  const exportSession = (session: Session) => {
    const blob = new Blob([JSON.stringify(session, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `livescene-session-${new Date(session.startTime).toISOString().slice(0, 19).replace(/:/g, "-")}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="max-w-4xl mx-auto px-3 sm:px-4 py-6 sm:py-8">
      {/* Header */}
      <div className="flex items-start sm:items-center justify-between mb-6 sm:mb-8 gap-3">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-white mb-1">
            Session <span className="text-brand">History</span>
          </h1>
          <p className="text-white/40 text-sm">
            {sessions.length} session{sessions.length !== 1 ? "s" : ""} recorded
          </p>
        </div>
        {sessions.length > 0 && (
          <Button
            variant="danger"
            size="sm"
            icon={<Trash2 size={14} />}
            onClick={handleClear}
          >
            Clear All
          </Button>
        )}
      </div>

      {/* Empty state */}
      {sessions.length === 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center justify-center py-24 gap-4 text-center"
        >
          <div className="w-16 h-16 rounded-2xl bg-dark-600 border border-white/8 flex items-center justify-center mb-2">
            <Database size={28} className="text-white/20" />
          </div>
          <h3 className="text-white/40 font-semibold text-lg">
            No sessions yet
          </h3>
          <p className="text-white/20 text-sm max-w-xs">
            Run the Analyzer to start recording sessions. They'll be saved here
            automatically.
          </p>
        </motion.div>
      )}

      {/* Session list */}
      <div className="flex flex-col gap-4">
        <AnimatePresence>
          {sessions.map((session, i) => (
            <motion.div
              key={session.id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ delay: i * 0.06 }}
            >
              <Card noPadding>
                {/* Session summary row */}
                <div
                  className="flex items-center gap-3 p-4 sm:p-5 cursor-pointer hover:bg-white/3 transition-colors rounded-2xl"
                  onClick={() => toggleExpand(session.id)}
                >
                  {/* Index */}
                  <div className="w-10 h-10 rounded-xl bg-brand/10 border border-brand/20 flex items-center justify-center text-brand font-bold text-sm flex-shrink-0">
                    {sessions.length - i}
                  </div>

                  {/* Meta */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Calendar size={13} className="text-white/30" />
                      <span className="text-sm text-white font-medium">
                        {formatDate(session.startTime)}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-3 text-xs text-white/35">
                      <span className="flex items-center gap-1">
                        <Clock size={11} /> {formatDuration(session.durationMs)}
                      </span>
                      <span className="flex items-center gap-1">
                        <Eye size={11} /> {session.totalObjects} detections
                      </span>
                      <span className="flex items-center gap-1">
                        <MessageSquare size={11} />{" "}
                        {session.narrations?.length ?? 0} narrations
                      </span>
                      <span className="flex items-center gap-1">
                        <Activity size={11} /> {session.activities?.length ?? 0}{" "}
                        events
                      </span>
                    </div>
                  </div>

                  {/* Labels */}
                  <div className="hidden md:flex flex-wrap gap-1.5 max-w-[200px]">
                    {(session.uniqueLabels || []).slice(0, 4).map((label) => (
                      <span
                        key={label}
                        className="px-2 py-0.5 rounded-full bg-dark-500 border border-white/10 text-xs text-white/50 font-mono"
                      >
                        {label}
                      </span>
                    ))}
                    {(session.uniqueLabels?.length ?? 0) > 4 && (
                      <span className="px-2 py-0.5 rounded-full bg-dark-500 border border-white/10 text-xs text-white/30">
                        +{session.uniqueLabels.length - 4}
                      </span>
                    )}
                  </div>

                  {/* Expand toggle */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        exportSession(session);
                      }}
                      title="Export JSON"
                      className="w-7 h-7 rounded-lg bg-dark-500 border border-white/10 flex items-center justify-center text-white/30 hover:text-brand hover:border-brand/40 transition-colors"
                    >
                      <Download size={12} />
                    </button>
                    <div className="text-white/25">
                      {expandedId === session.id ? (
                        <ChevronUp size={16} />
                      ) : (
                        <ChevronDown size={16} />
                      )}
                    </div>
                  </div>
                </div>

                {/* Expanded detail */}
                <AnimatePresence>
                  {expandedId === session.id && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.25 }}
                      className="overflow-hidden"
                    >
                      <div className="border-t border-white/8 px-4 sm:px-5 pb-5 pt-4 flex flex-col gap-5 min-w-0">
                        {/* Mini bar chart — label frequency */}
                        {(session.uniqueLabels?.length ?? 0) > 0 && (
                          <div>
                            <p className="text-xs text-white/30 font-medium uppercase tracking-wider mb-3">
                              Detected Classes
                            </p>
                            <ResponsiveContainer width="100%" height={80}>
                              <BarChart
                                data={session.uniqueLabels.map((l) => ({
                                  label: l,
                                  count: session.labelCounts?.[l] ?? 1,
                                }))}
                                margin={{
                                  top: 0,
                                  right: 4,
                                  left: -28,
                                  bottom: 0,
                                }}
                              >
                                <XAxis
                                  dataKey="label"
                                  tick={{
                                    fill: "rgba(255,255,255,0.35)",
                                    fontSize: 9,
                                  }}
                                  axisLine={false}
                                  tickLine={false}
                                />
                                <YAxis hide />
                                <Tooltip
                                  contentStyle={{
                                    background: "rgba(18,18,28,0.95)",
                                    border: "1px solid rgba(255,255,255,0.1)",
                                    borderRadius: 8,
                                    fontSize: 11,
                                    color: "#fff",
                                  }}
                                  cursor={{ fill: "rgba(255,255,255,0.04)" }}
                                />
                                <Bar dataKey="count" radius={[3, 3, 0, 0]}>
                                  {session.uniqueLabels.map((_, idx) => (
                                    <Cell
                                      key={idx}
                                      fill={`hsl(${(idx * 47) % 360}, 70%, 55%)`}
                                    />
                                  ))}
                                </Bar>
                              </BarChart>
                            </ResponsiveContainer>
                          </div>
                        )}

                        {/* Narrations */}
                        <div>
                          <p className="text-xs text-white/30 font-medium uppercase tracking-wider mb-3">
                            Narrations
                          </p>
                          <div className="flex flex-col gap-2">
                            {(session.narrations || []).slice(0, 6).map((n) => (
                              <div key={n.id} className="flex gap-3">
                                <span className="text-xs text-white/20 font-mono w-16 flex-shrink-0 mt-0.5">
                                  {new Date(n.timestamp).toLocaleTimeString(
                                    "en-US",
                                    {
                                      hour: "2-digit",
                                      minute: "2-digit",
                                      second: "2-digit",
                                      hour12: false,
                                    },
                                  )}
                                </span>
                                <p className="text-xs text-white/60 italic">
                                  &ldquo;{n.text}&rdquo;
                                </p>
                              </div>
                            ))}
                            {(session.narrations?.length ?? 0) === 0 && (
                              <p className="text-xs text-white/20">
                                No narrations recorded
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </Card>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default History;
