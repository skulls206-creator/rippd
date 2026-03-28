import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
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
      {/* Trigger button — always shows gradient + name */}
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label="Change theme"
        className="flex items-center gap-0 rounded-xl overflow-hidden border transition-all duration-200 hover:scale-[1.03] active:scale-[0.97]"
        style={{
          borderColor: "hsl(var(--border))",
          boxShadow: "0 2px 12px hsl(var(--primary) / 0.2)",
        }}
      >
        {/* Gradient swatch strip */}
        <span
          className="block w-8 h-8 shrink-0"
          style={{ background: theme.swatch }}
        />
        {/* Name + chevron */}
        <span
          className="flex items-center gap-1.5 px-2.5 h-8 text-xs font-bold tracking-wide whitespace-nowrap"
          style={{
            background: "hsl(var(--card) / 0.9)",
            color: "hsl(var(--foreground))",
          }}
        >
          {theme.name}
          <svg
            className={`w-3 h-3 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2.5}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </span>
      </button>

      {/* Dropdown */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -6 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -6 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 top-full mt-2 z-50 p-2 rounded-2xl shadow-2xl"
            style={{
              background: "hsl(var(--card) / 0.96)",
              border: "1px solid hsl(var(--border))",
              backdropFilter: "blur(32px)",
              WebkitBackdropFilter: "blur(32px)",
              minWidth: 240,
            }}
          >
            <p
              className="text-[10px] font-bold uppercase tracking-widest px-1 mb-2"
              style={{ color: "hsl(var(--muted-foreground))" }}
            >
              Choose a theme
            </p>

            <div className="grid grid-cols-2 gap-1.5">
              {themes.map((t) => {
                const active = theme.id === t.id;
                return (
                  <button
                    key={t.id}
                    onClick={() => { setTheme(t); setOpen(false); }}
                    className="rounded-xl overflow-hidden text-left transition-all duration-150 hover:scale-[1.03] active:scale-[0.97]"
                    style={{
                      outline: active ? "2px solid hsl(var(--primary))" : "2px solid transparent",
                      outlineOffset: 2,
                    }}
                  >
                    {/* Gradient preview band */}
                    <div
                      className="w-full h-10"
                      style={{ background: t.swatch }}
                    />
                    {/* Label */}
                    <div
                      className="px-2.5 py-1.5 flex items-center justify-between"
                      style={{
                        background: active
                          ? "hsl(var(--primary) / 0.12)"
                          : "hsl(var(--secondary))",
                      }}
                    >
                      <span
                        className="text-xs font-semibold"
                        style={{ color: active ? "hsl(var(--primary))" : "hsl(var(--foreground))" }}
                      >
                        {t.name}
                      </span>
                      {active && (
                        <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="hsl(var(--primary))" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
