import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Keyboard } from "lucide-react";

interface Shortcut {
  key: string;
  description: string;
}

interface HelpModalProps {
  open: boolean;
  onClose: () => void;
  shortcuts: Shortcut[];
}

const HelpModal: React.FC<HelpModalProps> = ({ open, onClose, shortcuts }) => {
  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            key="help-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Panel */}
          <motion.div
            key="help-panel"
            initial={{ opacity: 0, scale: 0.95, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 16 }}
            transition={{ type: "spring", stiffness: 380, damping: 32 }}
            className="fixed z-50 inset-x-4 top-1/2 -translate-y-1/2 mx-auto max-w-sm
                       rounded-2xl bg-dark-700 border border-white/12 shadow-2xl overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/8">
              <div className="flex items-center gap-2.5">
                <Keyboard size={16} className="text-brand" />
                <span className="font-semibold text-white text-sm">
                  Keyboard Shortcuts
                </span>
              </div>
              <button
                onClick={onClose}
                className="w-7 h-7 rounded-lg flex items-center justify-center
                           text-white/40 hover:text-white hover:bg-white/8 transition-colors"
              >
                <X size={14} />
              </button>
            </div>

            {/* Shortcut list */}
            <div className="p-4 flex flex-col gap-1">
              {shortcuts.map((s) => (
                <div
                  key={s.key}
                  className="flex items-center justify-between px-3 py-2 rounded-lg hover:bg-white/4 transition-colors"
                >
                  <span className="text-white/65 text-sm">{s.description}</span>
                  <kbd
                    className="inline-flex items-center justify-center min-w-[28px] h-7 px-2
                               rounded-md bg-dark-600 border border-white/14 font-mono text-xs
                               text-white/80 shadow-sm"
                  >
                    {s.key === " " ? "Space" : s.key.toUpperCase()}
                  </kbd>
                </div>
              ))}
            </div>

            <p className="px-5 pb-4 text-[11px] text-white/25 text-center">
              Shortcuts inactive when a text field is focused
            </p>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default HelpModal;
