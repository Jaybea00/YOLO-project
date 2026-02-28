import React, { useEffect, useRef, useState } from "react";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

type Trend = "up" | "down" | "neutral";

interface StatsCardProps {
  title: string;
  value: number | string;
  description?: string;
  icon?: React.ReactNode;
  trend?: Trend;
  trendValue?: string;
  color?: "brand" | "cyan" | "green" | "orange" | "red";
  index?: number;
}

const colorMap = {
  brand: {
    bg: "bg-brand/10",
    border: "border-brand/20",
    text: "text-brand",
    icon: "text-brand",
    ring: "rgba(110,86,207,0.5)",
  },
  cyan: {
    bg: "bg-neon-cyan/10",
    border: "border-neon-cyan/20",
    text: "text-neon-cyan",
    icon: "text-neon-cyan",
    ring: "rgba(50,217,200,0.5)",
  },
  green: {
    bg: "bg-neon-green/10",
    border: "border-neon-green/20",
    text: "text-neon-green",
    icon: "text-neon-green",
    ring: "rgba(48,209,88,0.5)",
  },
  orange: {
    bg: "bg-neon-orange/10",
    border: "border-neon-orange/20",
    text: "text-neon-orange",
    icon: "text-neon-orange",
    ring: "rgba(255,159,10,0.5)",
  },
  red: {
    bg: "bg-neon-red/10",
    border: "border-neon-red/20",
    text: "text-neon-red",
    icon: "text-neon-red",
    ring: "rgba(255,69,58,0.5)",
  },
};

const TrendIcon = ({ trend }: { trend: Trend }) => {
  if (trend === "up")
    return <TrendingUp size={13} className="text-neon-green" />;
  if (trend === "down")
    return <TrendingDown size={13} className="text-neon-red" />;
  return <Minus size={13} className="text-white/30" />;
};

// ── Animated numeric counter ──────────────────────────────────────────────────
function AnimatedNumber({
  value,
  colorClass,
}: {
  value: number;
  colorClass: string;
}) {
  const motionVal = useMotionValue(value);
  const spring = useSpring(motionVal, { stiffness: 120, damping: 20 });
  const display = useTransform(spring, (v) => Math.round(v).toLocaleString());

  const prevRef = useRef(value);
  const [pulsing, setPulsing] = useState(false);

  useEffect(() => {
    if (value !== prevRef.current) {
      motionVal.set(value);
      setPulsing(true);
      const t = setTimeout(() => setPulsing(false), 600);
      prevRef.current = value;
      return () => clearTimeout(t);
    }
  }, [value, motionVal]);

  return (
    <span className="relative inline-block">
      {pulsing && (
        <motion.span
          initial={{ scale: 1, opacity: 0.6 }}
          animate={{ scale: 2.2, opacity: 0 }}
          transition={{ duration: 0.55, ease: "easeOut" }}
          className={`absolute inset-0 rounded-full ${colorClass.replace("text-", "bg-")}/25 pointer-events-none`}
        />
      )}
      <motion.span className={`text-3xl font-display font-bold ${colorClass}`}>
        {display}
      </motion.span>
    </span>
  );
}

// ── StatsCard ─────────────────────────────────────────────────────────────────
const StatsCard: React.FC<StatsCardProps> = ({
  title,
  value,
  description,
  icon,
  trend = "neutral",
  trendValue,
  color = "brand",
  index = 0,
}) => {
  const c = colorMap[color];
  const isNumeric = typeof value === "number";

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.08, duration: 0.4 }}
      className="rounded-2xl border border-white/8 bg-dark-700/80 backdrop-blur-sm p-5 flex flex-col gap-3"
    >
      {/* Icon + label */}
      <div className="flex items-center justify-between">
        <span className="text-xs text-white/40 font-medium uppercase tracking-wider">
          {title}
        </span>
        {icon && (
          <div
            className={`w-8 h-8 rounded-xl ${c.bg} border ${c.border} flex items-center justify-center ${c.icon}`}
          >
            {icon}
          </div>
        )}
      </div>

      {/* Value */}
      <div className="flex items-end justify-between">
        {isNumeric ? (
          <AnimatedNumber value={value as number} colorClass={c.text} />
        ) : (
          <motion.span
            key={String(value)}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className={`text-3xl font-display font-bold ${c.text}`}
          >
            {value}
          </motion.span>
        )}

        {trendValue && (
          <div className="flex items-center gap-1 mb-1">
            <TrendIcon trend={trend} />
            <span className="text-xs text-white/40 font-mono">
              {trendValue}
            </span>
          </div>
        )}
      </div>

      {description && <p className="text-xs text-white/30">{description}</p>}
    </motion.div>
  );
};

export default StatsCard;
