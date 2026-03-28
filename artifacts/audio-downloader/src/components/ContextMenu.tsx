import { useEffect, useRef, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useLocation } from "wouter";
import {
  RefreshCw,
  Home,
  Link2,
  Share2,
  Trash2,
  CheckCheck,
  ClipboardPaste,
  Palette,
} from "lucide-react";
import { useTheme } from "../hooks/useTheme";

interface MenuItem {
  icon: React.ReactNode;
  label: string;
  sublabel?: string;
  action: () => void | Promise<void>;
  danger?: boolean;
  separator?: boolean;
}

const LONG_PRESS_MS = 600;
const MOVE_THRESHOLD = 12;

export function ContextMenu() {
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  const [copied, setCopied] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const touchOrigin = useRef<{ x: number; y: number } | null>(null);
  const [, navigate] = useLocation();
  const { theme, setTheme, themes } = useTheme();

  const open = useCallback((x: number, y: number) => {
    setPos({ x, y });
    setCopied(false);
  }, []);

  const close = useCallback(() => setPos(null), []);

  const cancelLongPress = useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
    touchOrigin.current = null;
  }, []);

  // Right-click on desktop
  useEffect(() => {
    const onContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      open(e.clientX, e.clientY);
    };
    document.addEventListener("contextmenu", onContextMenu);
    return () => document.removeEventListener("contextmenu", onContextMenu);
  }, [open]);

  // Long-press on mobile
  useEffect(() => {
    const onTouchStart = (e: TouchEvent) => {
      cancelLongPress();
      const touch = e.touches[0];
      touchOrigin.current = { x: touch.clientX, y: touch.clientY };
      longPressTimer.current = setTimeout(() => {
        if (touchOrigin.current) open(touchOrigin.current.x, touchOrigin.current.y);
        touchOrigin.current = null;
      }, LONG_PRESS_MS);
    };
    const onTouchMove = (e: TouchEvent) => {
      if (!touchOrigin.current) return;
      const touch = e.touches[0];
      const dx = Math.abs(touch.clientX - touchOrigin.current.x);
      const dy = Math.abs(touch.clientY - touchOrigin.current.y);
      if (dx > MOVE_THRESHOLD || dy > MOVE_THRESHOLD) cancelLongPress();
    };
    document.addEventListener("touchstart", onTouchStart, { passive: true });
    document.addEventListener("touchmove", onTouchMove, { passive: true });
    document.addEventListener("touchend", cancelLongPress, { passive: true });
    document.addEventListener("touchcancel", cancelLongPress, { passive: true });
    return () => {
      document.removeEventListener("touchstart", onTouchStart);
      document.removeEventListener("touchmove", onTouchMove);
      document.removeEventListener("touchend", cancelLongPress);
      document.removeEventListener("touchcancel", cancelLongPress);
    };
  }, [open, cancelLongPress]);

  // Dismiss on outside click or Escape
  useEffect(() => {
    if (!pos) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    const onPointerDown = (e: PointerEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) close();
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onPointerDown);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onPointerDown);
    };
  }, [pos, close]);

  const getAdjustedPos = (raw: { x: number; y: number }) => {
    const menuW = 230;
    const menuH = 380;
    const pad = 12;
    let x = raw.x;
    let y = raw.y;
    if (x + menuW > window.innerWidth - pad) x = window.innerWidth - menuW - pad;
    if (y + menuH > window.innerHeight - pad) y = window.innerHeight - menuH - pad;
    if (x < pad) x = pad;
    if (y < pad) y = pad;
    return { x, y };
  };

  const run = (fn: () => void | Promise<void>) => {
    close();
    setTimeout(() => fn(), 120);
  };

  const handlePasteAndRip = async () => {
    try {
      const text = await navigator.clipboard.readText();
      const url = text.trim();
      if (url) {
        window.dispatchEvent(new CustomEvent("rippd:paste-rip", { detail: { url } }));
      }
    } catch {
      // Clipboard permission denied — silently ignore
    }
  };

  const handleCycleTheme = () => {
    const idx = themes.findIndex((t) => t.id === theme.id);
    const next = themes[(idx + 1) % themes.length];
    setTheme(next);
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(close, 900);
  };

  const handleShare = async () => {
    if (navigator.share) {
      await navigator.share({ title: "RIPPD", text: "Download audio as MP3", url: window.location.href });
    } else {
      await handleCopy();
    }
  };

  const handleClearCache = async () => {
    if ("caches" in window) {
      const names = await caches.keys();
      await Promise.all(names.map((n) => caches.delete(n)));
    }
    if ("serviceWorker" in navigator) {
      const regs = await navigator.serviceWorker.getRegistrations();
      await Promise.all(regs.map((r) => r.unregister()));
    }
    window.location.reload();
  };

  // Next theme name for subtitle
  const nextThemeIdx = themes.findIndex((t) => t.id === theme.id);
  const nextTheme = themes[(nextThemeIdx + 1) % themes.length];

  const items: MenuItem[] = [
    {
      icon: <ClipboardPaste className="w-4 h-4" />,
      label: "Paste & Rip",
      sublabel: "Paste URL and download now",
      action: handlePasteAndRip,
      separator: true,
    },
    {
      icon: <RefreshCw className="w-4 h-4" />,
      label: "Refresh",
      sublabel: "Reload the page",
      action: () => window.location.reload(),
    },
    {
      icon: <Home className="w-4 h-4" />,
      label: "Go to Home",
      sublabel: "Back to the start",
      action: () => navigate("/"),
      separator: true,
    },
    {
      icon: (
        <span
          className="w-3 h-3 rounded-full ring-1 ring-white/20"
          style={{ background: nextTheme.swatch, display: "block" }}
        />
      ),
      label: "Cycle Theme",
      sublabel: `Switch to ${nextTheme.name}`,
      action: handleCycleTheme,
    },
    {
      icon: copied ? <CheckCheck className="w-4 h-4" /> : <Link2 className="w-4 h-4" />,
      label: copied ? "Copied!" : "Copy Link",
      sublabel: "Copy the page URL",
      action: handleCopy,
    },
    {
      icon: <Share2 className="w-4 h-4" />,
      label: "Share",
      sublabel: "Send to someone",
      action: handleShare,
      separator: true,
    },
    {
      icon: <Trash2 className="w-4 h-4" />,
      label: "Clear Cache & Reload",
      sublabel: "Fix loading issues",
      action: handleClearCache,
      danger: true,
    },
  ];

  const adjusted = pos ? getAdjustedPos(pos) : null;

  return (
    <AnimatePresence>
      {pos && adjusted && (
        <>
          <div className="fixed inset-0 z-[9998]" onClick={close} />
          <motion.div
            ref={menuRef}
            key="ctx-menu"
            initial={{ opacity: 0, scale: 0.88 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.88 }}
            transition={{ duration: 0.18, ease: [0.34, 1.56, 0.64, 1] }}
            className="fixed z-[9999] w-[230px] py-1.5 rounded-2xl shadow-2xl overflow-hidden"
            style={{
              left: adjusted.x,
              top: adjusted.y,
              background: "hsl(var(--card) / 0.94)",
              border: "1px solid hsl(var(--border))",
              backdropFilter: "blur(40px)",
              WebkitBackdropFilter: "blur(40px)",
            }}
          >
            <div className="px-3 pt-1.5 pb-2 border-b flex items-center gap-2" style={{ borderColor: "hsl(var(--border))" }}>
              <span
                className="w-3 h-3 rounded-full ring-1 ring-white/20 shrink-0"
                style={{ background: theme.swatch }}
              />
              <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: "hsl(var(--muted-foreground))" }}>
                RIPPD · {theme.name}
              </p>
            </div>

            <div className="py-1">
              {items.map((item, i) => (
                <div key={i}>
                  <button
                    onClick={() => run(item.action)}
                    className="w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors duration-100"
                    style={{ color: item.danger ? "hsl(var(--destructive))" : "hsl(var(--foreground))" }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLElement).style.background = item.danger
                        ? "hsl(var(--destructive) / 0.1)"
                        : "hsl(var(--primary) / 0.1)";
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLElement).style.background = "transparent";
                    }}
                  >
                    <span
                      className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                      style={{
                        background: item.danger ? "hsl(var(--destructive) / 0.12)" : "hsl(var(--primary) / 0.12)",
                        color: item.danger ? "hsl(var(--destructive))" : "hsl(var(--primary))",
                      }}
                    >
                      {item.icon}
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold leading-none mb-0.5">{item.label}</p>
                      {item.sublabel && (
                        <p className="text-[11px] leading-none" style={{ color: "hsl(var(--muted-foreground))" }}>
                          {item.sublabel}
                        </p>
                      )}
                    </div>
                  </button>
                  {item.separator && (
                    <div className="mx-3 my-1 border-t" style={{ borderColor: "hsl(var(--border))" }} />
                  )}
                </div>
              ))}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
