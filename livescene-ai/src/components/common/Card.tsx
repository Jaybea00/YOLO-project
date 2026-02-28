import React from "react";
import { motion } from "framer-motion";
import { clsx } from "clsx";

interface CardProps {
  title?: string;
  content?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
  glow?: "brand" | "cyan" | "green" | "none";
  hover?: boolean;
  onClick?: () => void;
  header?: React.ReactNode;
  footer?: React.ReactNode;
  noPadding?: boolean;
}

const glowClasses = {
  brand: "hover:shadow-glow-brand hover:border-brand/30",
  cyan: "hover:shadow-glow-cyan hover:border-neon-cyan/30",
  green: "hover:shadow-glow-green hover:border-neon-green/30",
  none: "",
};

const Card: React.FC<CardProps> = ({
  title,
  content,
  children,
  className,
  glow = "none",
  hover = false,
  onClick,
  header,
  footer,
  noPadding = false,
}) => {
  const Wrapper = hover || onClick ? motion.div : "div";
  const motionProps =
    hover || onClick
      ? { whileHover: { y: -2 }, transition: { duration: 0.2 } }
      : {};

  return (
    <Wrapper
      {...(motionProps as object)}
      onClick={onClick}
      className={clsx(
        "rounded-2xl border border-white/8 bg-dark-700/80 backdrop-blur-sm shadow-card",
        "transition-all duration-300",
        hover && "cursor-pointer",
        glowClasses[glow],
        !noPadding && "p-5",
        className,
      )}
    >
      {header && (
        <div className="border-b border-white/8 pb-4 mb-4">{header}</div>
      )}
      {title && (
        <h3 className="text-white font-semibold text-base mb-3">{title}</h3>
      )}
      {content ?? children}
      {footer && (
        <div className="border-t border-white/8 pt-4 mt-4">{footer}</div>
      )}
    </Wrapper>
  );
};

export default Card;
