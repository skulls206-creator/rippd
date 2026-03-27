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
} from "lucide-react";

interface MenuItem {
  icon: React.ReactNode;
  label: string;
  sublabel?: string;
  action: () => void | Promise<void>;
  danger?: boolean;
  separator?: boolean;
}

const LONG_PRESS_MS = 500;

export function ContextMenu() {
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  const [copied, setCopied] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [, navigate] = useLocation();

  const open = useCallback((x: number, y: number) => {
    setPos({ x, y });
    setCopied(false);
  }, []);

  const close = useCallback(() => setPos(null), []);

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
      const touch = e.touches[0];
      longPressTimer.current = setTimeout(() => {
        open(touch.clientX, touch.clientY);
      }, LONG_PRESS_MS);
    };
    const cancelLongPress = () => {
      if (longPressTimer.current) {
        clearTimeout(longPressTimer.current);
        longPressTimer.current = null;
      }
    };
    document.addEventListener("touchstart", onTouchStart, { passive: true });
    document.addEventListener("touchend", cancelLongPress, { passive: true });
    document.addEventListener("touchmove", cancelLongPress, { passive: true });
    return () => {
      document.removeEventListener("touchstart", onTouchStart);
      document.removeEventListener("touchend", cancelLongPress);
      document.removeEventListener("touchmove", cancelLongPress);
    };
  }, [open]);

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

  // Smart position — keep menu inside viewport
  const getAdjustedPos = (raw: { x: number; y: number }) => {
    const menuW = 220;
    const menuH = 280;
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
    setTimeout(() => fn(), 100);
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

  const items: MenuItem[] = [
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
          {/* invisible full-screen backdrop to catch outside taps */}
          <div className="fixed inset-0 z-[9998]" onClick={close} />

          <motion.div
            ref={menuRef}
            key="ctx-menu"
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.92 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className="fixed z-[9999] w-[220px] py-1.5 rounded-2xl shadow-2xl overflow-hidden"
            style={{
              left: adjusted.x,
              top: adjusted.y,
              background: "hsl(var(--card) / 0.92)",
              border: "1px solid hsl(var(--border))",
              backdropFilter: "blur(32px)",
              WebkitBackdropFilter: "blur(32px)",
            }}
          >
            <div className="px-3 pt-1.5 pb-2 border-b" style={{ borderColor: "hsl(var(--border))" }}>
              <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: "hsl(var(--muted-foreground))" }}>
                RIPPD
              </p>
            </div>

            <div className="py-1">
              {items.map((item, i) => (
                <div key={i}>
                  <button
                    onClick={() => run(item.action)}
                    className="w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors duration-100 group"
                    style={{
                      color: item.danger ? "hsl(var(--destructive))" : "hsl(var(--foreground))",
                    }}
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
                      className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors duration-100"
                      style={{
                        background: item.danger
                          ? "hsl(var(--destructive) / 0.12)"
                          : "hsl(var(--primary) / 0.12)",
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
