import React from "react";
import { clsx } from "clsx";

interface LoadingSpinnerProps {
  size?: "sm" | "md" | "lg" | "xl";
  color?: "brand" | "cyan" | "white";
  text?: string;
  fullScreen?: boolean;
}

const sizeMap = {
  sm: "w-5 h-5 border-2",
  md: "w-8 h-8 border-2",
  lg: "w-12 h-12 border-[3px]",
  xl: "w-16 h-16 border-4",
};

const colorMap = {
  brand: "border-brand/20 border-t-brand",
  cyan: "border-neon-cyan/20 border-t-neon-cyan",
  white: "border-white/20 border-t-white",
};

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = "md",
  color = "brand",
  text,
  fullScreen = false,
}) => {
  const spinner = (
    <div className="flex flex-col items-center gap-3">
      <div
        className={clsx(
          "rounded-full animate-spin",
          sizeMap[size],
          colorMap[color],
        )}
      />
      {text && <span className="text-sm text-white/50 font-mono">{text}</span>}
    </div>
  );

  if (fullScreen) {
    return (
      <div className="fixed inset-0 bg-dark-900/80 backdrop-blur-sm flex items-center justify-center z-50">
        {spinner}
      </div>
    );
  }

  return spinner;
};

export default LoadingSpinner;
