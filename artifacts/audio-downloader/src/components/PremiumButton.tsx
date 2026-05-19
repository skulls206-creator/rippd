// ⚠️  UNUSED COMPONENT — Keep for reference if premium/upsell UI is re-added.
// Replaces the default shadcn Button with a flashier gradient design.
// Not imported anywhere in the current codebase.

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { motion, type HTMLMotionProps } from "framer-motion";

export interface ButtonProps extends Omit<HTMLMotionProps<"button">, "ref" | "children"> {
  variant?: "primary" | "secondary" | "outline";
  isLoading?: boolean;
  children?: ReactNode;
}

export function PremiumButton({
  className,
  variant = "primary",
  isLoading,
  children,
  ...props
}: ButtonProps) {
  const baseStyles =
    "relative inline-flex items-center justify-center font-display font-bold text-lg rounded-2xl transition-all duration-300 ease-out disabled:opacity-50 disabled:cursor-not-allowed overflow-hidden";

  const variants = {
    primary:
      "bg-gradient-to-r from-primary to-accent text-white shadow-[0_0_20px_rgba(192,38,211,0.25)] hover:shadow-[0_0_30px_rgba(192,38,211,0.4)] border-glass-border",
    secondary: "bg-glass-bg-hover text-foreground hover:bg-glass-bg-active border-glass-border-light",
    outline: "bg-transparent border-2 border-primary text-primary hover:bg-primary/10",
  };

  return (
    <motion.button
      whileHover={{ scale: 1.02, y: -2 }}
      whileTap={{ scale: 0.98, y: 0 }}
      className={cn(baseStyles, variants[variant], "px-8 py-4 w-full md:w-auto", className)}
      disabled={isLoading || props.disabled}
      {...props}
    >
      <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent hover:animate-[shimmer_1.5s_infinite]" />
      <span className="relative flex items-center justify-center gap-2">{children}</span>
    </motion.button>
  );
}

PremiumButton.displayName = "PremiumButton";
