import React from "react";
import { NavLink } from "react-router-dom";
import { motion } from "framer-motion";
import { Home, ScanLine, Clock } from "lucide-react";

interface BottomNavProps {
  isRunning?: boolean;
}

const navItems = [
  { to: "/", icon: Home, label: "Home", end: true },
  { to: "/analyze", icon: ScanLine, label: "Analyze", end: false },
  { to: "/history", icon: Clock, label: "History", end: false },
];

const BottomNav: React.FC<BottomNavProps> = ({ isRunning = false }) => {
  return (
    <nav className="md:hidden fixed bottom-0 inset-x-0 z-50 bg-dark-800/95 backdrop-blur-md border-t border-white/8 safe-area-pb">
      <div className="flex items-stretch h-16">
        {navItems.map(({ to, icon: Icon, label, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              `flex-1 flex flex-col items-center justify-center gap-1 relative transition-colors ${
                isActive ? "text-brand" : "text-white/40 active:text-white"
              }`
            }
          >
            {({ isActive }) => (
              <>
                {/* Active indicator line */}
                {isActive && (
                  <motion.span
                    layoutId="bottom-nav-indicator"
                    className="absolute top-0 left-1/4 right-1/4 h-0.5 rounded-full bg-brand"
                    transition={{ type: "spring", stiffness: 400, damping: 35 }}
                  />
                )}

                {/* Icon wrapper — shows running pulse on Analyze */}
                <div className="relative">
                  <Icon size={20} />
                  {to === "/analyze" && isRunning && (
                    <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-neon-green border border-dark-800 animate-pulse" />
                  )}
                </div>

                <span className="text-[10px] font-medium">{label}</span>
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  );
};

export default BottomNav;
