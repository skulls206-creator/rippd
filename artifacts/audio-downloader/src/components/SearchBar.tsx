import { forwardRef } from "react";
import { cn } from "@/lib/utils";
import { Link2, ArrowRight, Loader2 } from "lucide-react";
import { motion } from "framer-motion";

interface SearchBarProps extends React.InputHTMLAttributes<HTMLInputElement> {
  isLoading?: boolean;
  onSubmit: () => void;
}

export const SearchBar = forwardRef<HTMLInputElement, SearchBarProps>(
  ({ className, isLoading, onSubmit, ...props }, ref) => {
    return (
      <div
        className={cn(
          "relative flex items-center w-full group",
          "bg-white/[0.06] border border-white/10 rounded-2xl",
          "focus-within:border-primary/50 focus-within:bg-white/[0.08]",
          "transition-all duration-300 shadow-[0_4px_24px_rgba(0,0,0,0.3)]",
          className
        )}
      >
        <div className="pl-4 pr-2 flex-shrink-0 text-muted-foreground group-focus-within:text-primary/70 transition-colors duration-300">
          <Link2 className="h-4 w-4" />
        </div>

        <input
          ref={ref}
          className={cn(
            "flex-1 min-w-0 h-12 pr-2 bg-transparent text-sm text-foreground",
            "placeholder:text-muted-foreground/60",
            "focus:outline-none"
          )}
          {...props}
        />

        <div className="pr-1.5 flex-shrink-0">
          <motion.button
            type="submit"
            disabled={isLoading || props.disabled}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={onSubmit}
            className={cn(
              "flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold text-white",
              "bg-gradient-to-r from-primary to-accent",
              "shadow-[0_0_12px_rgba(192,38,211,0.3)]",
              "hover:shadow-[0_0_20px_rgba(192,38,211,0.45)]",
              "disabled:opacity-40 disabled:cursor-not-allowed",
              "transition-shadow duration-300 whitespace-nowrap"
            )}
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                Rip it
                <ArrowRight className="h-3.5 w-3.5" />
              </>
            )}
          </motion.button>
        </div>
      </div>
    );
  }
);
SearchBar.displayName = "SearchBar";
