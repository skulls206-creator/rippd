import { Link } from "wouter";
import { ThemePicker } from "./ThemePicker";

export function Header() {
  return (
    <header
      className="fixed top-0 left-0 right-0 z-50 flex justify-between items-center bg-background/60 backdrop-blur-md border-b border-white/5"
      style={{
        paddingTop: "calc(env(safe-area-inset-top, 0px) + 0.75rem)",
        paddingBottom: "0.75rem",
        paddingLeft: "max(1rem, calc(env(safe-area-inset-left, 0px) + 1rem))",
        paddingRight: "max(1rem, calc(env(safe-area-inset-right, 0px) + 1rem))",
      }}
    >
      <Link href="/" className="flex items-center gap-3 group">
        <div className="relative w-8 h-8">
          <div className="absolute inset-0 bg-primary blur-md opacity-40 group-hover:opacity-70 transition-opacity rounded-full" />
          <img
            src={`${import.meta.env.BASE_URL}logo.png`}
            alt="RIPPD logo"
            className="w-8 h-8 object-contain relative z-10"
          />
        </div>
        <span className="font-display font-bold text-xl tracking-wider" style={{ color: "hsl(var(--foreground))" }}>
          RIPP<span className="text-primary">D</span>
        </span>
      </Link>
      <ThemePicker />
    </header>
  );
}
