import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Bell,
  Plus,
  Trash2,
  ToggleLeft,
  ToggleRight,
  X,
  AlertTriangle,
} from "lucide-react";
import { AgentGoal, AlertEvent } from "../../hooks/useAlert";

interface AlertPanelProps {
  goals: AgentGoal[];
  alerts: AlertEvent[];
  onAddGoal: (text: string) => void;
  onRemoveGoal: (id: string) => void;
  onToggleGoal: (id: string) => void;
  onClearAlerts: () => void;
}

const EXAMPLES = [
  "Alert me if a person appears",
  "Alert me if a cell phone is detected",
  "Alert me if a person and laptop are in the scene",
  "Alert me if a knife is visible",
];

const AlertPanel: React.FC<AlertPanelProps> = ({
  goals,
  alerts,
  onAddGoal,
  onRemoveGoal,
  onToggleGoal,
  onClearAlerts,
}) => {
  const [input, setInput] = useState("");
  const [tab, setTab] = useState<"goals" | "history">("goals");

  const handleAdd = () => {
    if (input.trim()) {
      onAddGoal(input.trim());
      setInput("");
    }
  };

  return (
    <div className="flex flex-col h-full bg-dark-800/60 backdrop-blur-sm border border-white/8 rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/8">
        <div className="flex items-center gap-2">
          <Bell size={14} className="text-neon-orange" />
          <span className="text-sm font-semibold text-white">Agent Goals</span>
          {goals.filter((g) => g.active).length > 0 && (
            <span className="px-1.5 py-0.5 rounded-full bg-neon-orange/15 border border-neon-orange/25 text-neon-orange text-xs font-mono">
              {goals.filter((g) => g.active).length} active
            </span>
          )}
        </div>
        <div className="flex gap-1">
          <button
            onClick={() => setTab("goals")}
            className={`px-2.5 py-1 rounded-lg text-xs font-mono transition-colors ${
              tab === "goals"
                ? "bg-neon-orange/15 text-neon-orange border border-neon-orange/25"
                : "text-white/40 hover:text-white/70"
            }`}
          >
            Goals
          </button>
          <button
            onClick={() => setTab("history")}
            className={`px-2.5 py-1 rounded-lg text-xs font-mono transition-colors relative ${
              tab === "history"
                ? "bg-neon-orange/15 text-neon-orange border border-neon-orange/25"
                : "text-white/40 hover:text-white/70"
            }`}
          >
            Alerts
            {alerts.length > 0 && (
              <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-neon-orange text-black text-[9px] font-bold flex items-center justify-center">
                {alerts.length > 9 ? "9+" : alerts.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {tab === "goals" ? (
        <div className="flex flex-col flex-1 min-h-0">
          {/* Input */}
          <div className="p-3 border-b border-white/6">
            <div className="flex gap-2">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAdd()}
                placeholder="e.g. Alert me if a cell phone appears..."
                className="flex-1 px-3 py-2 rounded-xl bg-dark-700 border border-white/10 text-white/80 text-xs placeholder:text-white/25 focus:outline-none focus:border-neon-orange/40 font-mono"
              />
              <button
                onClick={handleAdd}
                disabled={!input.trim()}
                className="p-2 rounded-xl bg-neon-orange/15 border border-neon-orange/25 text-neon-orange hover:bg-neon-orange/25 disabled:opacity-30 transition-colors"
              >
                <Plus size={14} />
              </button>
            </div>
            {/* Example chips */}
            <div className="flex flex-wrap gap-1 mt-2">
              {EXAMPLES.map((ex) => (
                <button
                  key={ex}
                  onClick={() => setInput(ex)}
                  className="px-2 py-0.5 rounded-full bg-white/5 border border-white/8 text-white/35 text-[10px] font-mono hover:text-white/60 hover:border-white/15 transition-colors"
                >
                  {ex.length > 30 ? ex.slice(0, 30) + "…" : ex}
                </button>
              ))}
            </div>
          </div>

          {/* Goal list */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2 min-h-0">
            <AnimatePresence>
              {goals.length === 0 && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-center py-8"
                >
                  <Bell size={28} className="text-white/10 mx-auto mb-2" />
                  <p className="text-white/25 text-xs font-mono">
                    No goals set
                  </p>
                  <p className="text-white/15 text-xs mt-1">
                    Add a goal to get alerts
                  </p>
                </motion.div>
              )}
              {goals.map((goal) => (
                <motion.div
                  key={goal.id}
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className={`flex items-start gap-2 p-2.5 rounded-xl border transition-colors ${
                    goal.active
                      ? "bg-neon-orange/6 border-neon-orange/20"
                      : "bg-white/4 border-white/8 opacity-50"
                  }`}
                >
                  <button
                    onClick={() => onToggleGoal(goal.id)}
                    className="mt-0.5 flex-shrink-0"
                  >
                    {goal.active ? (
                      <ToggleRight size={16} className="text-neon-orange" />
                    ) : (
                      <ToggleLeft size={16} className="text-white/30" />
                    )}
                  </button>
                  <div className="flex-1 min-w-0">
                    <p className="text-white/80 text-xs font-mono leading-relaxed">
                      {goal.text}
                    </p>
                    {goal.triggerCount > 0 && (
                      <p className="text-neon-orange/60 text-[10px] mt-0.5">
                        Triggered {goal.triggerCount}× · last{" "}
                        {new Date(goal.triggeredAt!).toLocaleTimeString()}
                      </p>
                    )}
                  </div>
                  <button
                    onClick={() => onRemoveGoal(goal.id)}
                    className="p-1 rounded-lg text-white/20 hover:text-neon-red hover:bg-neon-red/10 transition-colors flex-shrink-0"
                  >
                    <Trash2 size={12} />
                  </button>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>
      ) : (
        /* Alert history */
        <div className="flex flex-col flex-1 min-h-0">
          {alerts.length > 0 && (
            <div className="px-3 py-2 border-b border-white/6 flex justify-end">
              <button
                onClick={onClearAlerts}
                className="flex items-center gap-1 text-[10px] font-mono text-white/30 hover:text-neon-red transition-colors"
              >
                <Trash2 size={10} /> Clear all
              </button>
            </div>
          )}
          <div className="flex-1 overflow-y-auto p-3 space-y-2 min-h-0">
            <AnimatePresence>
              {alerts.length === 0 && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-center py-8"
                >
                  <AlertTriangle
                    size={28}
                    className="text-white/10 mx-auto mb-2"
                  />
                  <p className="text-white/25 text-xs font-mono">
                    No alerts fired yet
                  </p>
                </motion.div>
              )}
              {alerts.map((alert) => (
                <motion.div
                  key={alert.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="p-2.5 rounded-xl bg-neon-orange/8 border border-neon-orange/25"
                >
                  <div className="flex items-start justify-between gap-2">
                    <AlertTriangle
                      size={12}
                      className="text-neon-orange mt-0.5 flex-shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-white/80 text-xs font-mono">
                        {alert.goalText}
                      </p>
                      <p className="text-white/40 text-[10px] mt-0.5">
                        {alert.reason}
                      </p>
                    </div>
                    <span className="text-white/25 text-[10px] font-mono flex-shrink-0">
                      {new Date(alert.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>
      )}
    </div>
  );
};

export default AlertPanel;
