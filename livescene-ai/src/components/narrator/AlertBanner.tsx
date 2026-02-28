import React, { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, X } from "lucide-react";
import { AlertEvent } from "../../hooks/useAlert";

interface AlertBannerProps {
  alert: AlertEvent | null;
  onDismiss: () => void;
}

const AlertBanner: React.FC<AlertBannerProps> = ({ alert, onDismiss }) => {
  // Auto-dismiss after 6 seconds
  useEffect(() => {
    if (!alert) return;
    const t = setTimeout(onDismiss, 6000);
    return () => clearTimeout(t);
  }, [alert, onDismiss]);

  return (
    <AnimatePresence>
      {alert && (
        <motion.div
          initial={{ opacity: 0, y: -60, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -40, scale: 0.97 }}
          transition={{ type: "spring", stiffness: 400, damping: 28 }}
          className="fixed top-4 left-1/2 -translate-x-1/2 z-50 w-full max-w-lg px-4"
        >
          <div className="relative flex items-start gap-3 px-4 py-3 rounded-2xl bg-dark-800/95 backdrop-blur-xl border-2 border-neon-orange/60 shadow-[0_0_40px_rgba(255,159,10,0.3)]">
            {/* Pulsing icon */}
            <div className="flex-shrink-0 w-9 h-9 rounded-xl bg-neon-orange/15 border border-neon-orange/30 flex items-center justify-center">
              <AlertTriangle
                size={18}
                className="text-neon-orange animate-pulse"
              />
            </div>

            <div className="flex-1 min-w-0">
              <p className="text-neon-orange font-semibold text-sm tracking-wide uppercase">
                🚨 Agent Alert Triggered
              </p>
              <p className="text-white/80 text-sm mt-0.5 font-mono leading-snug">
                {alert.goalText}
              </p>
              <p className="text-white/40 text-xs mt-1">
                {alert.reason} ·{" "}
                {new Date(alert.timestamp).toLocaleTimeString()}
              </p>
            </div>

            <button
              onClick={onDismiss}
              className="flex-shrink-0 p-1 rounded-lg text-white/30 hover:text-white/70 hover:bg-white/8 transition-colors"
            >
              <X size={14} />
            </button>

            {/* Progress bar auto-dismiss */}
            <motion.div
              initial={{ scaleX: 1 }}
              animate={{ scaleX: 0 }}
              transition={{ duration: 6, ease: "linear" }}
              style={{ transformOrigin: "left" }}
              className="absolute bottom-0 left-0 right-0 h-0.5 rounded-b-2xl bg-neon-orange/50"
            />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default AlertBanner;
