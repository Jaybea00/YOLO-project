import React, { useState } from "react";
import { NavLink } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Brain,
  Home,
  ScanLine,
  Clock,
  BarChart3,
  ChevronLeft,
  ChevronRight,
  Cpu,
  Zap,
} from "lucide-react";

interface SidebarProps {
  isRunning?: boolean;
  fps?: number;
}

const navItems = [
  { to: "/", icon: Home, label: "Home", end: true },
  { to: "/analyze", icon: ScanLine, label: "Analyze", end: false },
  { to: "/history", icon: Clock, label: "History", end: false },
];

const Sidebar: React.FC<SidebarProps> = ({ isRunning = false, fps = 0 }) => {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <motion.aside
      animate={{ width: collapsed ? 72 : 220 }}
      transition={{ type: "spring", damping: 25, stiffness: 250 }}
      className="hidden md:flex flex-col h-full bg-dark-800 border-r border-white/8 flex-shrink-0 relative z-10"
    >
      {/* Logo area */}
      <div className="h-16 flex items-center px-4 border-b border-white/8">
        <div className="w-8 h-8 rounded-xl bg-brand flex items-center justify-center shadow-glow-brand flex-shrink-0">
          <Brain size={18} className="text-white" />
        </div>
        <AnimatePresence>
          {!collapsed && (
            <motion.span
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              className="ml-3 font-display font-bold text-white text-base whitespace-nowrap overflow-hidden"
            >
              LiveScene <span className="text-brand">AI</span>
            </motion.span>
          )}
        </AnimatePresence>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-2 py-4 flex flex-col gap-1">
        {navItems.map(({ to, icon: Icon, label, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group ${
                isActive
                  ? "bg-brand/15 text-brand"
                  : "text-white/50 hover:text-white hover:bg-white/5"
              }`
            }
          >
            {({ isActive }) => (
              <>
                <Icon
                  size={18}
                  className={`flex-shrink-0 transition-colors ${isActive ? "text-brand" : "group-hover:text-white"}`}
                />
                <AnimatePresence>
                  {!collapsed && (
                    <motion.span
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="text-sm font-medium whitespace-nowrap overflow-hidden"
                    >
                      {label}
                    </motion.span>
                  )}
                </AnimatePresence>
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Status panel */}
      <div className="px-2 py-3 border-t border-white/8 flex flex-col gap-2">
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-dark-600">
          <Cpu
            size={14}
            className={isRunning ? "text-neon-green" : "text-white/30"}
          />
          <AnimatePresence>
            {!collapsed && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex items-center gap-2 min-w-0"
              >
                <span className="text-xs text-white/50 whitespace-nowrap">
                  YOLO
                </span>
                <span
                  className={`text-xs font-mono font-semibold ${isRunning ? "text-neon-green" : "text-white/30"}`}
                >
                  {isRunning ? "ACTIVE" : "IDLE"}
                </span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {isRunning && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-dark-600">
            <Zap size={14} className="text-neon-orange" />
            <AnimatePresence>
              {!collapsed && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex items-center gap-2"
                >
                  <span className="text-xs text-white/50">FPS</span>
                  <span className="text-xs font-mono text-neon-orange font-semibold">
                    {fps}
                  </span>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Collapse toggle */}
      <button
        onClick={() => setCollapsed((prev) => !prev)}
        className="absolute -right-3 top-20 w-6 h-6 rounded-full bg-dark-600 border border-white/15 flex items-center justify-center text-white/50 hover:text-white hover:bg-dark-500 transition-colors shadow-card"
      >
        {collapsed ? <ChevronRight size={12} /> : <ChevronLeft size={12} />}
      </button>
    </motion.aside>
  );
};

export default Sidebar;
