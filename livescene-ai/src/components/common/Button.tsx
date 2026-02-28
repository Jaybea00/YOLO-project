import React from "react";
import { motion } from "framer-motion";
import { clsx } from "clsx";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger" | "success";
type ButtonSize = "sm" | "md" | "lg";

interface ButtonProps {
  onClick?: () => void;
  children: React.ReactNode;
  className?: string;
  disabled?: boolean;
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: React.ReactNode;
  iconRight?: React.ReactNode;
  loading?: boolean;
  type?: "button" | "submit" | "reset";
  fullWidth?: boolean;
  title?: string;
}

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    "bg-brand text-white hover:bg-brand-light shadow-glow-brand border border-brand/30",
  secondary: "bg-dark-600 text-white hover:bg-dark-500 border border-white/10",
  ghost:
    "bg-transparent text-white/70 hover:text-white hover:bg-white/5 border border-white/10",
  danger:
    "bg-neon-red/20 text-neon-red hover:bg-neon-red/30 border border-neon-red/40",
  success:
    "bg-neon-green/20 text-neon-green hover:bg-neon-green/30 border border-neon-green/40",
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: "px-3 py-1.5 text-xs gap-1.5 min-h-[36px] sm:min-h-0",
  md: "px-5 py-2.5 text-sm gap-2 min-h-[44px]",
  lg: "px-7 py-3.5 text-base gap-2.5 min-h-[48px]",
};

const Button: React.FC<ButtonProps> = ({
  onClick,
  children,
  className = "",
  disabled = false,
  variant = "primary",
  size = "md",
  icon,
  iconRight,
  loading = false,
  type = "button",
  fullWidth = false,
  title,
}) => {
  return (
    <motion.button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      title={title}
      whileHover={{ scale: disabled || loading ? 1 : 1.02 }}
      whileTap={{ scale: disabled || loading ? 1 : 0.97 }}
      className={clsx(
        "inline-flex items-center justify-center rounded-xl font-medium transition-all duration-200",
        "disabled:opacity-40 disabled:cursor-not-allowed",
        variantClasses[variant],
        sizeClasses[size],
        fullWidth && "w-full",
        className,
      )}
    >
      {loading ? (
        <span className="inline-block w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
      ) : icon ? (
        <span className="flex-shrink-0">{icon}</span>
      ) : null}
      {children}
      {iconRight && !loading && (
        <span className="flex-shrink-0">{iconRight}</span>
      )}
    </motion.button>
  );
};

export default Button;
