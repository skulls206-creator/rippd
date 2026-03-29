import { useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Upload, Search, Download, Loader2, Check, AlertCircle,
  ChevronUp, ChevronDown, ChevronsUpDown, ArrowLeft,
  Music2, Users, Clock, ListMusic, FileJson, FileText,
  Play, SkipForward, ExternalLink,
} from "lucide-react";
import { Link } from "wouter";
import { Header } from "@/components/Header";
import { useSearchDownloadAudio } from "@workspace/api-client-react";

interface SpotifyTrack {
  key: string;
  track: string;
  artist: string;
  album: string;
  plays: number;
  msPlayed: number;
  spotifyUri: string | null;
  ytSearchQuery: string;
}

type SortCol = "track" | "artist" | "album" | "plays" | "msPlayed";
type SortDir = "asc" | "desc";
type TrackStatus = "idle" | "queued" | "downloading" | "done" | "error";

const PAGE_SIZE = 50;

function fmtTime(ms: number): string {
  const mins = Math.floor(ms / 60000);
  if (mins < 60) return `${mins}m`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}

function fmtHours(ms: number): string {
  return (ms / 3600000).toFixed(1);
}

async function saveBlob(token: string, filename: string): Promise<void> {
  const fileRes = await fetch(`/api/download/file/${token}`);
  if (!fileRes.ok) throw new Error("File expired");
  const blob = await fileRes.blob();
  const blobUrl = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = blobUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(blobUrl), 5000);
}

function parseSpotifyFiles(files: File[]): Promise<SpotifyTrack[]> {
  return new Promise((resolve) => {
    let remaining = files.length;
    if (remaining === 0) { resolve([]); return; }

    const aggregated = new Map<string, SpotifyTrack>();

    const finish = () => resolve(Array.from(aggregated.values()));

    for (const file of files) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const json = JSON.parse(e.target?.result as string);
          const entries = Array.isArray(json) ? json : [];

          for (const entry of entries) {
            const track =
              entry.master_metadata_track_name ??
              entry.trackName ??
              null;
            const artist =
              entry.master_metadata_album_artist_name ??
              entry.artistName ??
              null;

            if (!track || !artist) continue;

            const album =
              entry.master_metadata_album_album_name ??
              entry.albumName ??
              "";
            const ms = entry.ms_played ?? entry.msPlayed ?? 0;
            const uri = entry.spotify_track_uri ?? entry.trackUri ?? null;
            const key = `${artist.toLowerCase()}|||${track.toLowerCase()}`;

            if (aggregated.has(key)) {
              const existing = aggregated.get(key)!;
              existing.plays += 1;
              existing.msPlayed += ms;
            } else {
              aggregated.set(key, {
                key,
                track,
                artist,
                album,
                plays: 1,
                msPlayed: ms,
                spotifyUri: uri,
                ytSearchQuery: `${artist} ${track}`,
              });
            }
          }
        } catch {
          // skip malformed entries
        }
        remaining--;
        if (remaining === 0) finish();
      };
      reader.onerror = () => {
        remaining--;
        if (remaining === 0) finish();
      };
      reader.readAsText(file);
    }
  });
}

function SortIcon({ col, active, dir }: { col: string; active: boolean; dir: SortDir }) {
  if (!active) return <ChevronsUpDown className="w-3 h-3 opacity-30" />;
  return dir === "asc"
    ? <ChevronUp className="w-3 h-3" />
    : <ChevronDown className="w-3 h-3" />;
}

function SpotifyUriCell({ uri }: { uri: string | null }) {
  if (!uri) return <span className="text-muted-foreground/40">—</span>;
  const trackId = uri.startsWith("spotify:track:") ? uri.slice("spotify:track:".length) : null;
  const url = trackId ? `https://open.spotify.com/track/${trackId}` : null;
  return (
    <span
      className="flex items-center gap-1 text-[10px] font-mono truncate max-w-[80px]"
      style={{ color: "hsl(141 72% 48%)" }}
      title={uri}
    >
      {url ? (
        <a href={url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 hover:opacity-70 transition-opacity">
          <ExternalLink className="w-3 h-3 flex-shrink-0" />
          <span className="truncate">{trackId?.slice(0, 8)}…</span>
        </a>
      ) : (
        <span className="truncate">{uri.slice(0, 12)}…</span>
      )}
    </span>
  );
}

export default function SpotifyHistory() {
  const [tracks, setTracks] = useState<SpotifyTrack[]>([]);
  const [statuses, setStatuses] = useState<Record<string, TrackStatus>>({});
  const [isDragging, setIsDragging] = useState(false);
  const [isParsing, setIsParsing] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [sortCol, setSortCol] = useState<SortCol>("plays");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [page, setPage] = useState(1);
  const [isQueueRunning, setIsQueueRunning] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef2 = useRef<HTMLInputElement>(null);
  const queueRef = useRef<SpotifyTrack[]>([]);
  const runningRef = useRef(false);

  const { mutateAsync: searchMutate } = useSearchDownloadAudio();
  const searchMutateRef = useRef(searchMutate);
  searchMutateRef.current = searchMutate;

  const handleFiles = async (files: FileList | File[]) => {
    const arr = Array.from(files).filter(
      (f) => f.name.endsWith(".json") || f.type === "application/json"
    );
    if (arr.length === 0) {
      setParseError("No JSON files found. Drop your Streaming_History_Audio_*.json files.");
      return;
    }
    setIsParsing(true);
    setParseError(null);
    try {
      const parsed = await parseSpotifyFiles(arr);
      if (parsed.length === 0) {
        setParseError("No tracks found. Make sure you're dropping Spotify streaming history JSON files.");
      } else {
        setTracks((prev) => {
          if (prev.length === 0) return parsed;
          const merged = new Map(prev.map((t) => [t.key, t]));
          for (const t of parsed) {
            if (merged.has(t.key)) {
              const existing = merged.get(t.key)!;
              merged.set(t.key, {
                ...existing,
                plays: existing.plays + t.plays,
                msPlayed: existing.msPlayed + t.msPlayed,
              });
            } else {
              merged.set(t.key, t);
            }
          }
          return Array.from(merged.values());
        });
        setPage(1);
      }
    } catch {
      setParseError("Failed to parse files.");
    } finally {
      setIsParsing(false);
    }
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleFiles(e.dataTransfer.files);
  };

  const filtered = tracks.filter((t) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      t.track.toLowerCase().includes(q) ||
      t.artist.toLowerCase().includes(q) ||
      t.album.toLowerCase().includes(q)
    );
  });

  const sorted = [...filtered].sort((a, b) => {
    const mul = sortDir === "asc" ? 1 : -1;
    const av = a[sortCol];
    const bv = b[sortCol];
    if (typeof av === "string" && typeof bv === "string")
      return av.localeCompare(bv) * mul;
    return ((av as number) - (bv as number)) * mul;
  });

  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const paginated = sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const uniqueArtists = new Set(tracks.map((t) => t.artist)).size;
  const totalPlays = tracks.reduce((s, t) => s + t.plays, 0);
  const totalMs = tracks.reduce((s, t) => s + t.msPlayed, 0);

  const handleSort = (col: SortCol) => {
    if (sortCol === col) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortCol(col);
      setSortDir("desc");
    }
    setPage(1);
  };

  const processQueue = useCallback(async () => {
    if (runningRef.current) return;
    runningRef.current = true;
    setIsQueueRunning(true);

    while (queueRef.current.length > 0) {
      const track = queueRef.current.shift()!;
      setStatuses((prev) => ({ ...prev, [track.key]: "downloading" }));
      try {
        const result = await searchMutateRef.current({ data: { query: track.ytSearchQuery } });
        await saveBlob(result.token, result.filename);
        setStatuses((prev) => ({ ...prev, [track.key]: "done" }));
      } catch {
        setStatuses((prev) => ({ ...prev, [track.key]: "error" }));
      }
    }

    runningRef.current = false;
    setIsQueueRunning(false);
  }, []);

  const ripOne = (track: SpotifyTrack) => {
    const s = statuses[track.key];
    if (s === "queued" || s === "downloading") return;
    setStatuses((prev) => ({ ...prev, [track.key]: "queued" }));
    queueRef.current.push(track);
    processQueue();
  };

  const queueAll = () => {
    const eligible = filtered.filter((t) => {
      const s = statuses[t.key];
      return s !== "queued" && s !== "downloading" && s !== "done";
    });
    if (eligible.length === 0) return;
    const initial: Record<string, TrackStatus> = {};
    for (const t of eligible) initial[t.key] = "queued";
    setStatuses((prev) => ({ ...prev, ...initial }));
    queueRef.current.push(...eligible);
    processQueue();
  };

  const exportJson = () => {
    const data = filtered.map((t) => ({
      track: t.track,
      artist: t.artist,
      album: t.album,
      plays: t.plays,
      minutesListened: Math.floor(t.msPlayed / 60000),
      ytSearchQuery: t.ytSearchQuery,
      spotifyUri: t.spotifyUri,
    }));
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "rippd-spotify-history.json";
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  };

  const exportCsv = () => {
    const header = "Track,Artist,Album,Plays,Minutes Listened,YT Search Query,Spotify URI";
    const rows = filtered.map((t) =>
      [
        `"${t.track.replace(/"/g, '""')}"`,
        `"${t.artist.replace(/"/g, '""')}"`,
        `"${t.album.replace(/"/g, '""')}"`,
        t.plays,
        Math.floor(t.msPlayed / 60000),
        `"${t.ytSearchQuery.replace(/"/g, '""')}"`,
        t.spotifyUri ?? "",
      ].join(",")
    );
    const csv = [header, ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "rippd-spotify-history.csv";
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  };

  const rowStatus = (key: string): TrackStatus => statuses[key] ?? "idle";

  const StatusIcon = ({ k }: { k: string }) => {
    const s = rowStatus(k);
    if (s === "downloading") return <Loader2 className="w-3.5 h-3.5 text-primary animate-spin" />;
    if (s === "done") return <Check className="w-3.5 h-3.5 text-green-400" />;
    if (s === "error") return <AlertCircle className="w-3.5 h-3.5 text-destructive" />;
    if (s === "queued") return <div className="w-3 h-3 rounded-full border border-primary/50 animate-pulse" />;
    return null;
  };

  const queuedCount = Object.values(statuses).filter((s) => s === "queued" || s === "downloading").length;
  const doneCount = Object.values(statuses).filter((s) => s === "done").length;

  const COLS = "1.6fr 0.9fr 0.9fr 52px 56px 90px 80px";

  return (
    <div className="min-h-screen flex flex-col relative overflow-hidden">
      <div
        className="absolute inset-0 z-0 opacity-25 mix-blend-screen pointer-events-none"
        style={{
          backgroundImage: `url('${import.meta.env.BASE_URL}images/bg-mesh.png')`,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      />
      <Header />

      <main
        className="flex-1 flex flex-col px-4 py-8 relative z-10 max-w-5xl mx-auto w-full"
        style={{ marginTop: "calc(env(safe-area-inset-top, 0px) + 3.5rem)" }}
      >

        {/* Page title + back */}
        <div className="flex items-center gap-3 mb-6">
          <Link
            href="/"
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/10 text-muted-foreground hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-white">Spotify History</h1>
            <p className="text-xs text-muted-foreground">Import your streaming history and rip anything to MP3</p>
          </div>
        </div>

        <AnimatePresence mode="wait">

          {/* ── DROP ZONE ── */}
          {tracks.length === 0 && (
            <motion.div
              key="dropzone"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.97 }}
              className="flex flex-col items-center gap-6"
            >
              <div
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={onDrop}
                onClick={() => fileInputRef.current?.click()}
                className="w-full max-w-lg mx-auto rounded-2xl border-2 border-dashed transition-all duration-200 cursor-pointer p-12 flex flex-col items-center gap-4 select-none"
                style={{
                  borderColor: isDragging ? "hsl(var(--primary))" : "hsl(var(--border))",
                  background: isDragging ? "hsl(var(--primary) / 0.06)" : "hsl(var(--card) / 0.5)",
                }}
              >
                <div
                  className="w-16 h-16 rounded-2xl flex items-center justify-center"
                  style={{ background: "hsl(var(--primary) / 0.12)", border: "1px solid hsl(var(--primary) / 0.25)" }}
                >
                  {isParsing
                    ? <Loader2 className="w-7 h-7 text-primary animate-spin" />
                    : <Upload className="w-7 h-7 text-primary" />
                  }
                </div>
                <div className="text-center">
                  <p className="text-sm font-semibold text-white mb-1">
                    {isParsing ? "Reading files…" : "Drop your Spotify history files"}
                  </p>
                  <p className="text-xs text-muted-foreground leading-relaxed max-w-xs">
                    {isParsing
                      ? "Parsing and deduplicating tracks…"
                      : <>Drop <code className="text-primary">Streaming_History_Audio_*.json</code> files from your Spotify data export ZIP, or click to browse</>
                    }
                  </p>
                </div>
                {!isParsing && (
                  <span
                    className="text-xs font-semibold px-4 py-1.5 rounded-full"
                    style={{ background: "hsl(var(--primary) / 0.15)", color: "hsl(var(--primary))" }}
                  >
                    Browse files
                  </span>
                )}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json,application/json"
                multiple
                className="hidden"
                onChange={(e) => e.target.files && handleFiles(e.target.files)}
              />

              {parseError && (
                <motion.div
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs text-destructive border border-destructive/20 bg-destructive/5"
                >
                  <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                  {parseError}
                </motion.div>
              )}

              {/* Instructions */}
              <div
                className="w-full max-w-lg rounded-2xl p-5 space-y-3"
                style={{ background: "hsl(var(--card) / 0.5)", border: "1px solid hsl(var(--border))" }}
              >
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">How to export from Spotify</p>
                <ol className="space-y-1.5 text-xs text-muted-foreground list-decimal list-inside leading-relaxed">
                  <li>Go to <strong className="text-white">spotify.com → Account → Privacy settings</strong></li>
                  <li>Click <strong className="text-white">Request data download</strong> (Extended streaming history)</li>
                  <li>Wait for the email (up to 30 days) then download the ZIP</li>
                  <li>Extract and drop the <code className="text-primary">Streaming_History_Audio_*.json</code> files here</li>
                </ol>
              </div>
            </motion.div>
          )}

          {/* ── TRACK TABLE ── */}
          {tracks.length > 0 && (
            <motion.div
              key="table"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col gap-4"
            >
              {/* Stats bar */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { icon: <ListMusic className="w-4 h-4" />, label: "Unique tracks", value: tracks.length.toLocaleString() },
                  { icon: <Play className="w-4 h-4" />, label: "Total plays", value: totalPlays.toLocaleString() },
                  { icon: <Users className="w-4 h-4" />, label: "Unique artists", value: uniqueArtists.toLocaleString() },
                  { icon: <Clock className="w-4 h-4" />, label: "Hours listened", value: `${fmtHours(totalMs)}h` },
                ].map((s) => (
                  <div
                    key={s.label}
                    className="rounded-xl p-3 flex flex-col gap-1"
                    style={{ background: "hsl(var(--card) / 0.6)", border: "1px solid hsl(var(--border))" }}
                  >
                    <div className="flex items-center gap-1.5 text-primary">{s.icon}</div>
                    <p className="text-lg font-bold text-white">{s.value}</p>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wide">{s.label}</p>
                  </div>
                ))}
              </div>

              {/* Controls row */}
              <div className="flex flex-wrap gap-2 items-center">
                {/* Search */}
                <div
                  className="flex items-center gap-2 flex-1 min-w-40 h-9 px-3 rounded-xl"
                  style={{ background: "hsl(var(--input))", border: "1px solid hsl(var(--border))" }}
                >
                  <Search className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                  <input
                    type="text"
                    placeholder="Search tracks or artists…"
                    value={search}
                    onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                    className="flex-1 bg-transparent text-xs text-white placeholder-muted-foreground outline-none min-w-0"
                  />
                </div>

                {/* Queue all */}
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={queueAll}
                  className="flex items-center gap-1.5 h-9 px-3 rounded-xl text-xs font-semibold transition-all"
                  style={{
                    background: "hsl(var(--primary) / 0.15)",
                    border: "1px solid hsl(var(--primary) / 0.3)",
                    color: "hsl(var(--primary))",
                  }}
                >
                  <SkipForward className="w-3.5 h-3.5" />
                  Queue {search ? "Filtered" : "All"}
                  {queuedCount > 0 && <span className="ml-1 opacity-70">({queuedCount})</span>}
                </motion.button>

                {/* Export JSON */}
                <button
                  onClick={exportJson}
                  className="flex items-center gap-1.5 h-9 px-3 rounded-xl text-xs font-semibold transition-all hover:opacity-80"
                  style={{
                    background: "hsl(var(--secondary))",
                    border: "1px solid hsl(var(--border))",
                    color: "hsl(var(--foreground))",
                  }}
                >
                  <FileJson className="w-3.5 h-3.5" />
                  JSON
                </button>

                {/* Export CSV */}
                <button
                  onClick={exportCsv}
                  className="flex items-center gap-1.5 h-9 px-3 rounded-xl text-xs font-semibold transition-all hover:opacity-80"
                  style={{
                    background: "hsl(var(--secondary))",
                    border: "1px solid hsl(var(--border))",
                    color: "hsl(var(--foreground))",
                  }}
                >
                  <FileText className="w-3.5 h-3.5" />
                  CSV
                </button>

                {/* Load more files */}
                <button
                  onClick={() => fileInputRef2.current?.click()}
                  className="flex items-center gap-1.5 h-9 px-3 rounded-xl text-xs font-semibold transition-all hover:opacity-80"
                  style={{
                    background: "hsl(var(--secondary))",
                    border: "1px solid hsl(var(--border))",
                    color: "hsl(var(--muted-foreground))",
                  }}
                >
                  <Upload className="w-3.5 h-3.5" />
                  More files
                </button>
                <input
                  ref={fileInputRef2}
                  type="file"
                  accept=".json,application/json"
                  multiple
                  className="hidden"
                  onChange={(e) => e.target.files && handleFiles(e.target.files)}
                />
              </div>

              {/* Queue status bar */}
              {(isQueueRunning || doneCount > 0) && (
                <div
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs"
                  style={{ background: "hsl(var(--card) / 0.7)", border: "1px solid hsl(var(--border))" }}
                >
                  {isQueueRunning && <Loader2 className="w-3.5 h-3.5 text-primary animate-spin" />}
                  {!isQueueRunning && doneCount > 0 && <Check className="w-3.5 h-3.5 text-green-400" />}
                  <span className="text-muted-foreground">
                    {isQueueRunning
                      ? `Ripping… ${doneCount} done, ${queuedCount} remaining`
                      : `${doneCount} track${doneCount !== 1 ? "s" : ""} ripped`}
                  </span>
                </div>
              )}

              {/* Table */}
              <div
                className="rounded-2xl overflow-hidden"
                style={{ border: "1px solid hsl(var(--border))" }}
              >
                {/* Table header */}
                <div
                  className="grid text-[10px] font-bold uppercase tracking-widest text-muted-foreground px-4 py-2.5"
                  style={{
                    gridTemplateColumns: COLS,
                    background: "hsl(var(--card) / 0.8)",
                    borderBottom: "1px solid hsl(var(--border))",
                  }}
                >
                  {(["track", "artist", "album", "plays", "msPlayed"] as SortCol[]).map((col) => (
                    <button
                      key={col}
                      onClick={() => handleSort(col)}
                      className="flex items-center gap-1 hover:text-white transition-colors text-left"
                    >
                      {col === "msPlayed" ? "Time" : col.charAt(0).toUpperCase() + col.slice(1)}
                      <SortIcon col={col} active={sortCol === col} dir={sortDir} />
                    </button>
                  ))}
                  <span>URI</span>
                  <span>Action</span>
                </div>

                {/* Rows */}
                <div
                  className="divide-y overflow-y-auto"
                  style={{
                    maxHeight: "55vh",
                    background: "hsl(var(--card) / 0.4)",
                  }}
                >
                  {paginated.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-16 gap-2 text-muted-foreground">
                      <Music2 className="w-8 h-8 opacity-30" />
                      <p className="text-sm">No tracks match your search</p>
                    </div>
                  )}
                  {paginated.map((t) => {
                    const s = rowStatus(t.key);
                    return (
                      <div
                        key={t.key}
                        className="grid px-4 py-2.5 text-xs items-center transition-colors hover:bg-white/[0.02]"
                        style={{ gridTemplateColumns: COLS }}
                      >
                        {/* Track */}
                        <div className="flex items-center gap-2 min-w-0 pr-2">
                          <StatusIcon k={t.key} />
                          <span className={`truncate ${s === "done" ? "text-muted-foreground" : "text-white"}`}>
                            {t.track}
                          </span>
                        </div>
                        {/* Artist */}
                        <span className="text-muted-foreground truncate pr-2">{t.artist}</span>
                        {/* Album */}
                        <span className="text-muted-foreground truncate pr-2 hidden sm:block">{t.album || "—"}</span>
                        {/* Plays */}
                        <span className="text-muted-foreground">{t.plays}</span>
                        {/* Time */}
                        <span className="text-muted-foreground">{fmtTime(t.msPlayed)}</span>
                        {/* Spotify URI */}
                        <SpotifyUriCell uri={t.spotifyUri} />
                        {/* Action */}
                        <div>
                          {s === "idle" || s === "error" ? (
                            <motion.button
                              whileHover={{ scale: 1.05 }}
                              whileTap={{ scale: 0.95 }}
                              onClick={() => ripOne(t)}
                              className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all"
                              style={{
                                background: s === "error" ? "hsl(var(--destructive) / 0.15)" : "hsl(var(--primary) / 0.15)",
                                border: `1px solid ${s === "error" ? "hsl(var(--destructive) / 0.3)" : "hsl(var(--primary) / 0.3)"}`,
                                color: s === "error" ? "hsl(var(--destructive))" : "hsl(var(--primary))",
                              }}
                            >
                              <Download className="w-3 h-3" />
                              {s === "error" ? "Retry" : "Rip"}
                            </motion.button>
                          ) : s === "done" ? (
                            <span className="text-[11px] text-green-400 font-semibold flex items-center gap-1">
                              <Check className="w-3 h-3" /> Done
                            </span>
                          ) : (
                            <span className="text-[11px] text-muted-foreground">
                              {s === "downloading" ? "Ripping…" : "Queued"}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div
                    className="flex items-center justify-between px-4 py-2.5 text-xs text-muted-foreground"
                    style={{
                      background: "hsl(var(--card) / 0.8)",
                      borderTop: "1px solid hsl(var(--border))",
                    }}
                  >
                    <span>
                      {((page - 1) * PAGE_SIZE) + 1}–{Math.min(page * PAGE_SIZE, sorted.length)} of {sorted.length.toLocaleString()}
                    </span>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                        disabled={page === 1}
                        className="px-2.5 py-1 rounded-lg hover:bg-white/8 disabled:opacity-30 transition-colors"
                      >
                        ←
                      </button>
                      <span className="px-2">{page} / {totalPages}</span>
                      <button
                        onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                        disabled={page === totalPages}
                        className="px-2.5 py-1 rounded-lg hover:bg-white/8 disabled:opacity-30 transition-colors"
                      >
                        →
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <footer className="pb-6 text-center text-xs text-muted-foreground/40 relative z-10">
        Built with yt-dlp
      </footer>
    </div>
  );
}
