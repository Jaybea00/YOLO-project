import React from "react";
import { motion } from "framer-motion";
import { Shield, Monitor, Activity, ChevronRight } from "lucide-react";

// ─── Preset definitions ───────────────────────────────────────────────────────

export interface Preset {
  id: string;
  icon: React.ElementType;
  label: string;
  color: string; // tailwind text+border+bg classes
  accentColor: string; // hex for inline glow
  goals: string[];
  description: string;
}

export const PRESETS: Preset[] = [
  {
    id: "security",
    icon: Shield,
    label: "Security Mode",
    color:
      "text-neon-red border-neon-red/30 bg-neon-red/8 hover:bg-neon-red/15 hover:border-neon-red/50",
    accentColor: "#ff453a",
    description: "Monitor for intruders & suspicious items",
    goals: [
      "Alert me if a person appears",
      "Alert me if a knife is visible",
      "Alert me if a cell phone is detected",
      "Alert me if a backpack is in the scene",
    ],
  },
  {
    id: "workspace",
    icon: Monitor,
    label: "Workspace Mode",
    color:
      "text-neon-cyan border-neon-cyan/30 bg-neon-cyan/8 hover:bg-neon-cyan/15 hover:border-neon-cyan/50",
    accentColor: "#32d9c8",
    description: "Track your desk & equipment",
    goals: [
      "Alert me if a laptop is present",
      "Alert me if a person and laptop are in the scene",
      "Alert me if a cup is visible",
      "Alert me if a book appears",
    ],
  },
  {
    id: "activity",
    icon: Activity,
    label: "Activity Mode",
    color:
      "text-neon-green border-neon-green/30 bg-neon-green/8 hover:bg-neon-green/15 hover:border-neon-green/50",
    accentColor: "#30d158",
    description: "Track movement & interactions",
    goals: [
      "Alert me if a person appears",
      "Alert me if a person and cell phone are in the scene",
      "Alert me if a dog is visible",
      "Alert me if a cat appears",
    ],
  },
];

// ─── Component ────────────────────────────────────────────────────────────────

interface PresetBarProps {
  onApply: (preset: Preset) => void;
  activePresetId: string | null;
  disabled?: boolean;
}

const PresetBar: React.FC<PresetBarProps> = ({
  onApply,
  activePresetId,
  disabled = false,
}) => {
  return (
    <div className="px-4 py-2 border-b border-white/6 bg-dark-800/30 flex-shrink-0">
      <div className="flex items-center gap-2 overflow-x-auto pb-0.5 scrollbar-none scroll-smooth snap-x snap-mandatory">
        <span className="text-[10px] text-white/25 font-mono uppercase tracking-widest whitespace-nowrap mr-1 flex-shrink-0">
          Quick Start:
        </span>
        {PRESETS.map((preset, i) => {
          const isActive = activePresetId === preset.id;
          return (
            <motion.button
              key={preset.id}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.07 }}
              onClick={() => !disabled && onApply(preset)}
              disabled={disabled}
              title={`${preset.label}: ${preset.description}`}
              className={`
                flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium
                transition-all duration-200 flex-shrink-0 whitespace-nowrap snap-start
                min-h-[36px] disabled:opacity-40 disabled:cursor-not-allowed
                ${
                  isActive
                    ? preset.color + " ring-1 ring-current"
                    : preset.color + " opacity-70 hover:opacity-100"
                }
              `}
            >
              <preset.icon size={12} />
              {preset.label}
              {isActive && (
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="w-1.5 h-1.5 rounded-full bg-current animate-pulse"
                />
              )}
              {!isActive && <ChevronRight size={10} className="opacity-40" />}
            </motion.button>
          );
        })}
      </div>
    </div>
  );
};

export default PresetBar;
