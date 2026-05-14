import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, Download, ArrowLeft, Music2, Loader2, AlertCircle, ListMusic } from "lucide-react";
import type { PlaylistInfo, PlaylistTrack } from "@workspace/api-client-react";
import { apiUrl } from "@/lib/api-url";

type TrackStatus = "idle" | "queued" | "downloading" | "done" | "error";

interface PlaylistViewProps {
  playlist: PlaylistInfo;
  onBack: () => void;
}

function formatDuration(seconds: number | null | undefined): string {
  if (!seconds) return "";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

async function downloadTrack(track: PlaylistTrack): Promise<void> {
  const res = await fetch(apiUrl("/api/download/audio"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url: track.url }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Download failed");

  const fileRes = await fetch(apiUrl(`/api/download/file/${data.token}`));
  if (!fileRes.ok) throw new Error("File expired");
  const blob = await fileRes.blob();
  const blobUrl = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = blobUrl;
  a.download = data.filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(blobUrl), 5000);
}

export function PlaylistView({ playlist, onBack }: PlaylistViewProps) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [statuses, setStatuses] = useState<Record<string, TrackStatus>>({});
  const [isRunning, setIsRunning] = useState(false);
  const queueRef = useRef<PlaylistTrack[]>([]);
  const runningRef = useRef(false);

  const allSelected = selected.size === playlist.tracks.length;
  const selectedCount = selected.size;
  const doneCount = Object.values(statuses).filter(s => s === "done").length;
  const errorCount = Object.values(statuses).filter(s => s === "error").length;

  const toggleTrack = (id: string) => {
    if (isRunning) return;
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (isRunning) return;
    if (allSelected) {
      setSelected(new Set());
    } else {
      setSelected(new Set(playlist.tracks.map(t => t.id)));
    }
  };

  const processQueue = useCallback(async () => {
    if (runningRef.current) return;
    runningRef.current = true;
    setIsRunning(true);

    while (queueRef.current.length > 0) {
      const track = queueRef.current.shift()!;
      setStatuses(prev => ({ ...prev, [track.id]: "downloading" }));
      try {
        await downloadTrack(track);
        setStatuses(prev => ({ ...prev, [track.id]: "done" }));
      } catch {
        setStatuses(prev => ({ ...prev, [track.id]: "error" }));
      }
    }

    runningRef.current = false;
    setIsRunning(false);
  }, []);

  const startDownloads = () => {
    const tracks = playlist.tracks.filter(t => selected.has(t.id));
    queueRef.current = [...tracks];
    const initial: Record<string, TrackStatus> = {};
    for (const t of tracks) initial[t.id] = "queued";
    setStatuses(initial);
    processQueue();
  };

  const statusIcon = (id: string) => {
    const s = statuses[id];
    if (s === "downloading") return <Loader2 className="w-3.5 h-3.5 text-primary animate-spin flex-shrink-0" />;
    if (s === "done") return <Check className="w-3.5 h-3.5 text-green-400 flex-shrink-0" />;
    if (s === "error") return <AlertCircle className="w-3.5 h-3.5 text-destructive flex-shrink-0" />;
    if (s === "queued") return <div className="w-3.5 h-3.5 rounded-full border border-primary/50 flex-shrink-0" />;
    return null;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04] backdrop-blur-xl"
      style={{ maxHeight: "72vh" }}
    >
      {/* Header */}
      <div className="flex items-center gap-3 p-4 border-b border-white/8 flex-shrink-0">
        <button
          onClick={onBack}
          disabled={isRunning}
          className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/10 text-muted-foreground hover:text-white transition-colors disabled:opacity-40"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="flex-1 min-w-0">
          <p className="text-xs text-muted-foreground mb-0.5 flex items-center gap-1">
            <ListMusic className="w-3 h-3" /> Playlist
          </p>
          <h2 className="text-sm font-semibold text-white truncate">{playlist.title}</h2>
        </div>
        <span className="text-xs text-muted-foreground flex-shrink-0">
          {playlist.trackCount} tracks
        </span>
      </div>

      {/* Select all row */}
      <div className="flex items-center gap-3 px-4 py-2.5 border-b border-white/5 flex-shrink-0">
        <button
          onClick={toggleAll}
          disabled={isRunning}
          className={`w-4.5 h-4.5 rounded flex items-center justify-center border transition-colors disabled:opacity-50 flex-shrink-0 ${
            allSelected
              ? "bg-primary border-primary"
              : "border-white/20 hover:border-primary/50"
          }`}
          style={{ width: 18, height: 18 }}
        >
          {allSelected && <Check className="w-3 h-3 text-white" />}
        </button>
        <span className="text-xs text-muted-foreground">
          {selectedCount === 0 ? "Select all" : `${selectedCount} selected`}
        </span>

        {isRunning && (
          <span className="ml-auto text-xs text-muted-foreground">
            {doneCount}/{selectedCount} done{errorCount > 0 ? ` · ${errorCount} failed` : ""}
          </span>
        )}
      </div>

      {/* Track list */}
      <div className="flex-1 overflow-y-auto divide-y divide-white/5">
        {playlist.tracks.map((track) => {
          const isSelected = selected.has(track.id);
          const status = statuses[track.id];

          return (
            <button
              key={track.id}
              onClick={() => toggleTrack(track.id)}
              disabled={isRunning}
              className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors disabled:cursor-default ${
                isSelected && !isRunning ? "bg-primary/5 hover:bg-primary/8" : "hover:bg-white/4"
              }`}
            >
              {/* Checkbox or status */}
              <div className="flex-shrink-0 w-4 flex items-center justify-center">
                {status ? (
                  statusIcon(track.id)
                ) : (
                  <div
                    className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${
                      isSelected ? "bg-primary border-primary" : "border-white/20"
                    }`}
                  >
                    {isSelected && <Check className="w-2.5 h-2.5 text-white" />}
                  </div>
                )}
              </div>

              {/* Track number + title */}
              <span className="w-6 text-xs text-muted-foreground/50 flex-shrink-0 text-right">
                {track.index}
              </span>

              <div className="flex-1 min-w-0">
                <p className={`text-sm truncate ${status === "done" ? "text-muted-foreground" : "text-white"}`}>
                  {track.title}
                </p>
              </div>

              {/* Duration */}
              {track.duration != null && (
                <span className="text-xs text-muted-foreground/60 flex-shrink-0">
                  {formatDuration(track.duration)}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Download button */}
      <AnimatePresence>
        {selectedCount > 0 && !isRunning && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            className="p-3 border-t border-white/8 flex-shrink-0"
          >
            <motion.button
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              onClick={startDownloads}
              className="w-full flex items-center justify-center gap-2 h-10 rounded-xl bg-gradient-to-r from-primary to-accent text-white text-sm font-semibold shadow-[0_0_16px_rgba(192,38,211,0.3)] hover:shadow-[0_0_24px_rgba(192,38,211,0.45)] transition-shadow duration-300"
            >
              <Download className="w-4 h-4" />
              Download {selectedCount} track{selectedCount !== 1 ? "s" : ""}
            </motion.button>
          </motion.div>
        )}
        {isRunning && (
          <div className="p-3 border-t border-white/8 flex-shrink-0">
            <div className="w-full h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin text-primary" />
              Downloading {doneCount + 1} of {selectedCount}...
            </div>
          </div>
        )}
        {!isRunning && doneCount > 0 && selectedCount === 0 && (
          <div className="p-3 border-t border-white/8 flex-shrink-0 text-center text-xs text-muted-foreground">
            {doneCount} track{doneCount !== 1 ? "s" : ""} saved · Select more to download again
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
