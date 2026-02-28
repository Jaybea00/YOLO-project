import React, { useState, useEffect } from "react";
import { NavLink } from "react-router-dom";
import { motion } from "framer-motion";
import { Brain, Menu, X, Wifi, WifiOff, Settings } from "lucide-react";
import SettingsModal from "../common/SettingsModal";
import { useSettings } from "../../hooks/useSettings";

interface HeaderProps {
  isConnected?: boolean;
  isLive?: boolean;
}

const Header: React.FC<HeaderProps> = ({
  isConnected = true,
  isLive = false,
}) => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const { settings, updateSettings, resetSettings } = useSettings();

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 10);
    window.addEventListener("scroll", handler);
    return () => window.removeEventListener("scroll", handler);
  }, []);

  const navLinks = [
    { to: "/", label: "Home" },
    { to: "/analyze", label: "Analyze" },
    { to: "/history", label: "History" },
  ];

  return (
    <header
      className={`sticky top-0 z-40 w-full transition-all duration-300 ${
        scrolled
          ? "bg-dark-800/95 backdrop-blur-md border-b border-white/8 shadow-glass"
          : "bg-transparent"
      }`}
    >
      <SettingsModal
        open={showSettings}
        onClose={() => setShowSettings(false)}
        settings={settings}
        onChange={updateSettings}
        onReset={resetSettings}
      />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        {/* Logo */}
        <NavLink to="/" className="flex items-center gap-2.5 group">
          <motion.div
            whileHover={{ rotate: 360 }}
            transition={{ duration: 0.6 }}
            className="w-8 h-8 rounded-xl bg-brand flex items-center justify-center shadow-glow-brand"
          >
            <Brain size={18} className="text-white" />
          </motion.div>
          <span className="font-display font-bold text-white text-lg tracking-tight">
            LiveScene <span className="text-brand">AI</span>
          </span>
        </NavLink>

        {/* Desktop Nav */}
        <nav className="hidden md:flex items-center gap-1">
          {navLinks.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.to === "/"}
              className={({ isActive }) =>
                `px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                  isActive
                    ? "bg-brand/15 text-brand"
                    : "text-white/60 hover:text-white hover:bg-white/5"
                }`
              }
            >
              {link.label}
            </NavLink>
          ))}
        </nav>

        {/* Status Badge */}
        <div className="hidden md:flex items-center gap-3">
          {isLive && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-neon-green/15 border border-neon-green/30"
            >
              <span className="w-2 h-2 rounded-full bg-neon-green animate-pulse" />
              <span className="text-neon-green text-xs font-semibold font-mono">
                LIVE
              </span>
            </motion.div>
          )}
          <div
            className={`flex items-center gap-1.5 text-xs ${isConnected ? "text-neon-green" : "text-neon-red"}`}
          >
            {isConnected ? <Wifi size={14} /> : <WifiOff size={14} />}
            <span className="font-mono">
              {isConnected ? "Connected" : "Offline"}
            </span>
          </div>
          {/* Settings gear */}
          <button
            onClick={() => setShowSettings(true)}
            title="Settings"
            className="w-8 h-8 rounded-lg flex items-center justify-center
                       text-white/40 hover:text-white hover:bg-white/8
                       border border-transparent hover:border-white/10 transition-colors"
          >
            <Settings size={15} />
          </button>
        </div>

        {/* Mobile Menu Toggle */}
        <button
          className="md:hidden p-2 text-white/60 hover:text-white"
          onClick={() => setMobileOpen((prev) => !prev)}
        >
          {mobileOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {/* Mobile Menu */}
      {mobileOpen && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="md:hidden border-t border-white/8 bg-dark-800/98 px-4 py-3 flex flex-col gap-1"
        >
          {navLinks.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.to === "/"}
              onClick={() => setMobileOpen(false)}
              className={({ isActive }) =>
                `px-4 py-2.5 rounded-lg text-sm font-medium ${
                  isActive
                    ? "bg-brand/15 text-brand"
                    : "text-white/70 hover:text-white"
                }`
              }
            >
              {link.label}
            </NavLink>
          ))}

          {/* Status row inside mobile menu */}
          <div className="flex items-center gap-3 px-4 pt-3 mt-1 border-t border-white/8">
            {isLive && (
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-neon-green/15 border border-neon-green/30">
                <span className="w-1.5 h-1.5 rounded-full bg-neon-green animate-pulse" />
                <span className="text-neon-green text-xs font-semibold font-mono">
                  LIVE
                </span>
              </div>
            )}
            <div
              className={`flex items-center gap-1.5 text-xs ${isConnected ? "text-neon-green" : "text-neon-red"}`}
            >
              {isConnected ? <Wifi size={13} /> : <WifiOff size={13} />}
              <span className="font-mono">
                {isConnected ? "Connected" : "Offline"}
              </span>
            </div>
          </div>
        </motion.div>
      )}
    </header>
  );
};

export default Header;
