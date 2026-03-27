import { useEffect, useRef, useState } from "react";
import { useTheme } from "../hooks/useTheme";

export function ThemePicker() {
  const { theme, setTheme, themes } = useTheme();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label="Change theme"
        title="Change theme"
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-semibold border transition-all duration-200 hover:scale-105 active:scale-95"
        style={{
          background: "rgba(255,255,255,0.07)",
          borderColor: "rgba(255,255,255,0.12)",
          color: "hsl(var(--foreground))",
        }}
      >
        <span
          className="w-3.5 h-3.5 rounded-full shrink-0 ring-1 ring-white/20"
          style={{ background: theme.swatch }}
        />
        <span className="hidden sm:inline">{theme.name}</span>
        <svg
          className={`w-3 h-3 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2.5}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div
          className="absolute right-0 top-full mt-2 p-3 rounded-2xl shadow-2xl z-50 min-w-[200px]"
          style={{
            background: "hsl(var(--card))",
            border: "1px solid hsl(var(--border))",
            backdropFilter: "blur(24px)",
          }}
        >
          <p
            className="text-[10px] font-semibold uppercase tracking-widest mb-2.5 px-0.5"
            style={{ color: "hsl(var(--muted-foreground))" }}
          >
            Theme
          </p>
          <div className="grid grid-cols-2 gap-1.5">
            {themes.map((t) => (
              <button
                key={t.id}
                onClick={() => {
                  setTheme(t);
                  setOpen(false);
                }}
                className="flex items-center gap-2 px-2.5 py-2 rounded-xl text-left transition-all duration-150 hover:opacity-90"
                style={{
                  background:
                    theme.id === t.id
                      ? "hsl(var(--primary) / 0.15)"
                      : "transparent",
                  border:
                    theme.id === t.id
                      ? "1px solid hsl(var(--primary) / 0.35)"
                      : "1px solid transparent",
                  color: "hsl(var(--foreground))",
                }}
              >
                <span
                  className="w-5 h-5 rounded-full shrink-0 ring-1 ring-white/20 shadow-sm"
                  style={{ background: t.swatch }}
                />
                <span className="text-xs font-medium">{t.name}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
