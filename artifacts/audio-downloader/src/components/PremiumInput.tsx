import { forwardRef } from "react";
import { cn } from "@/lib/utils";
import { Link2 } from "lucide-react";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: boolean;
}

export const PremiumInput = forwardRef<HTMLInputElement, InputProps>(
  ({ className, error, ...props }, ref) => {
    return (
      <div className="relative group w-full">
        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-muted-foreground group-focus-within:text-primary transition-colors duration-300">
          <Link2 className="h-6 w-6" />
        </div>
        <input
          ref={ref}
          className={cn(
            "w-full h-16 pl-12 pr-4 rounded-2xl bg-secondary/50 border-2 border-transparent text-lg text-foreground placeholder:text-muted-foreground",
            "focus:outline-none focus:border-primary/50 focus:bg-secondary/80 focus:ring-4 focus:ring-primary/20",
            "transition-all duration-300 ease-out shadow-inner",
            error && "border-destructive/50 focus:border-destructive focus:ring-destructive/20",
            className
          )}
          {...props}
        />
      </div>
    );
  }
);
PremiumInput.displayName = "PremiumInput";
