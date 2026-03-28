import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Download, Music2, RotateCcw, AlertCircle, Sparkles, Loader2, ShieldAlert, ExternalLink } from "lucide-react";
import {
  useDownloadAudio,
  useGetPlaylistInfo,
  type DownloadAudioMutationError,
  type GetPlaylistInfoMutationError,
} from "@workspace/api-client-react";
import { Header } from "@/components/Header";
import { SearchBar } from "@/components/SearchBar";
import { AudioWave } from "@/components/AudioWave";
import { PlaylistView } from "@/components/PlaylistView";

const LOADING_TEXTS = [
  "Fetching track info...",
  "Downloading source audio...",
  "Converting to MP3...",
  "Finalising file...",
  "Almost ready...",
];

const PLAYLIST_LOADING_TEXTS = [
  "Loading playlist...",
  "Fetching track list...",
  "Almost there...",
];

function looksLikePlaylist(url: string): boolean {
  try {
    const u = new URL(url);
    const host = u.hostname.toLowerCase().replace(/^www\./, "");
    if (["youtube.com", "m.youtube.com", "music.youtube.com"].includes(host)) {
      return u.searchParams.has("list");
    }
    if (host === "soundcloud.com" || host === "m.soundcloud.com") {
      return u.pathname.includes("/sets/");
    }
    return false;
  } catch {
    return false;
  }
}

const DRM_HOSTS = new Set([
  "open.spotify.com",
  "spotify.com",
  "tidal.com",
  "music.apple.com",
]);

const DRM_SERVICE_NAMES: Record<string, string> = {
  "open.spotify.com": "Spotify",
  "spotify.com": "Spotify",
  "tidal.com": "Tidal",
  "music.apple.com": "Apple Music",
};

function getDrmService(url: string): string | null {
  try {
    const host = new URL(url).hostname.toLowerCase().replace(/^www\./, "");
    return DRM_HOSTS.has(host) ? (DRM_SERVICE_NAMES[host] ?? "this service") : null;
  } catch {
    return null;
  }
}

export default function Home() {
  const [url, setUrl] = useState("");
  const [loadingIdx, setLoadingIdx] = useState(0);
  const [isSaving, setIsSaving] = useState(false);

  const isPlaylist = looksLikePlaylist(url);
  const drmService = getDrmService(url);

  const {
    mutate: downloadAudio,
    isPending: isDownloadPending,
    data: downloadData,
    error: downloadError,
    reset: resetDownload,
  } = useDownloadAudio();

  const {
    mutate: loadPlaylist,
    isPending: isPlaylistPending,
    data: playlistData,
    error: playlistError,
    reset: resetPlaylist,
  } = useGetPlaylistInfo();

  const isPending = isDownloadPending || isPlaylistPending;
  const error = downloadError || playlistError;

  const loadingTexts = isPlaylistPending ? PLAYLIST_LOADING_TEXTS : LOADING_TEXTS;

  useEffect(() => {
    if (!isPending) { setLoadingIdx(0); return; }
    const id = setInterval(() => setLoadingIdx(i => (i + 1) % loadingTexts.length), 3500);
    return () => clearInterval(id);
  }, [isPending, loadingTexts.length]);

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!url.trim()) return;
    if (isPlaylist) {
      loadPlaylist({ data: { url: url.trim() } });
    } else {
      downloadAudio({ data: { url: url.trim() } });
    }
  };

  // Paste & Rip — triggered from the context menu
  useEffect(() => {
    const handler = (e: Event) => {
      const pastedUrl = (e as CustomEvent<{ url: string }>).detail.url;
      if (!pastedUrl) return;
      resetDownload();
      resetPlaylist();
      setUrl(pastedUrl);
      if (looksLikePlaylist(pastedUrl)) {
        loadPlaylist({ data: { url: pastedUrl } });
      } else {
        downloadAudio({ data: { url: pastedUrl } });
      }
    };
    window.addEventListener("rippd:paste-rip", handler);
    return () => window.removeEventListener("rippd:paste-rip", handler);
  }, [downloadAudio, loadPlaylist, resetDownload, resetPlaylist]);

  const handleReset = () => {
    resetDownload();
    resetPlaylist();
    setUrl("");
  };

  const getErrorMessage = (err: DownloadAudioMutationError | GetPlaylistInfoMutationError): string => {
    const d = err?.data;
    if (d && typeof d === "object" && "error" in d && typeof d.error === "string") return d.error;
    return err?.message ?? "Couldn't process that link. Check the URL and try again.";
  };

  const handleSave = async (token: string, filename: string) => {
    if (isSaving) return;
    setIsSaving(true);
    try {
      const res = await fetch(`/api/download/file/${token}`);
      if (!res.ok) throw new Error("File expired or unavailable.");
      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(blobUrl), 5000);
    } catch {
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col relative overflow-hidden">
      <div
        className="absolute inset-0 z-0 opacity-25 mix-blend-screen pointer-events-none"
        style={{ backgroundImage: `url('${import.meta.env.BASE_URL}images/bg-mesh.png')`, backgroundSize: "cover", backgroundPosition: "center" }}
      />

      <Header />

      <main className="flex-1 flex items-center justify-center px-4 py-8 relative z-10 mt-16">
        <div className="w-full max-w-xl mx-auto">
          <AnimatePresence mode="wait">

            {/* IDLE */}
            {!isPending && !downloadData && !playlistData && !error && (
              <motion.div
                key="idle"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.97 }}
                transition={{ duration: 0.4 }}
                className="space-y-8"
              >
                <div className="text-center space-y-3">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-semibold tracking-wide mb-2">
                    <Sparkles className="w-3 h-3" />
                    YouTube · SoundCloud · Bandcamp · more
                  </div>
                  <h1 className="text-4xl md:text-5xl font-extrabold text-white leading-tight">
                    Rip the audio.
                  </h1>
                  <p className="text-sm text-muted-foreground max-w-sm mx-auto leading-relaxed">
                    Paste any supported link and download the highest quality MP3 directly to your device.
                  </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-3">
                  <SearchBar
                    value={url}
                    onChange={e => setUrl(e.target.value)}
                    placeholder="Paste a YouTube, SoundCloud, or Bandcamp link..."
                    type="url"
                    required
                    disabled={isPending}
                    isPlaylist={isPlaylist}
                    onSubmit={() => handleSubmit()}
                  />

                  <AnimatePresence>
                    {drmService && (
                      <motion.div
                        key="drm-warning"
                        initial={{ opacity: 0, y: -8, scale: 0.98 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -6, scale: 0.98 }}
                        transition={{ duration: 0.25 }}
                        className="rounded-2xl border border-amber-500/25 bg-amber-500/8 backdrop-blur-xl p-4 space-y-3"
                      >
                        <div className="flex items-start gap-3">
                          <div className="w-8 h-8 rounded-lg bg-amber-500/15 border border-amber-500/30 flex items-center justify-center flex-shrink-0 mt-0.5">
                            <ShieldAlert className="w-4 h-4 text-amber-400" />
                          </div>
                          <div className="min-w-0 space-y-1">
                            <p className="text-sm font-semibold" style={{ color: "hsl(var(--foreground))" }}>
                              {drmService} uses DRM protection
                            </p>
                            <p className="text-xs leading-relaxed" style={{ color: "hsl(var(--muted-foreground))" }}>
                              {drmService} encrypts its audio so no tool can download it directly. But you can move your music to YouTube first, then rip it here.
                            </p>
                          </div>
                        </div>
                        <a
                          href="https://www.tunemymusic.com"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center justify-between w-full px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all duration-200 hover:brightness-110 active:scale-[0.98]"
                          style={{
                            background: "linear-gradient(135deg, hsl(38 100% 55% / 0.18), hsl(38 100% 55% / 0.08))",
                            border: "1px solid hsl(38 100% 55% / 0.3)",
                            color: "hsl(38 95% 65%)",
                          }}
                        >
                          <span>Move your {drmService} music to YouTube with TuneMyMusic</span>
                          <ExternalLink className="w-3.5 h-3.5 flex-shrink-0 ml-2" />
                        </a>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <p className="text-center text-xs text-muted-foreground/50">
                    For personal use only &bull; Files expire after 15 minutes
                  </p>
                </form>
              </motion.div>
            )}

            {/* LOADING */}
            {isPending && (
              <motion.div
                key="loading"
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 1.02 }}
                className="flex flex-col items-center justify-center text-center space-y-6 py-8"
              >
                <AudioWave />
                <div className="space-y-1.5">
                  <motion.p
                    key={loadingIdx}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-base font-semibold text-white"
                  >
                    {loadingTexts[loadingIdx]}
                  </motion.p>
                  <p className="text-xs text-muted-foreground">
                    {isPlaylistPending
                      ? "Fetching track list — this is quick."
                      : "Don't close this tab — this can take a minute for longer tracks."}
                  </p>
                </div>
              </motion.div>
            )}

            {/* PLAYLIST VIEW */}
            {playlistData && !isPending && (
              <motion.div key="playlist" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
                <PlaylistView playlist={playlistData} onBack={handleReset} />
              </motion.div>
            )}

            {/* SINGLE DOWNLOAD SUCCESS */}
            {downloadData && !isPending && (
              <motion.div
                key="success"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.05] backdrop-blur-xl p-6 space-y-5"
              >
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-48 bg-primary/15 blur-[80px] rounded-full pointer-events-none" />

                <div className="flex items-center gap-4">
                  <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-[0_0_20px_rgba(192,38,211,0.4)] flex-shrink-0">
                    <Music2 className="w-5 h-5 text-white" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] font-bold text-primary tracking-widest uppercase mb-0.5">Ready to download</p>
                    <h3 className="text-sm font-semibold text-white truncate" title={downloadData.title}>
                      {downloadData.title}
                    </h3>
                  </div>
                </div>

                <div className="flex gap-2">
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => handleSave(downloadData.token, downloadData.filename)}
                    disabled={isSaving}
                    className="flex-1 flex items-center justify-center gap-2 h-10 rounded-xl bg-gradient-to-r from-primary to-accent text-white text-sm font-semibold shadow-[0_0_16px_rgba(192,38,211,0.3)] hover:shadow-[0_0_24px_rgba(192,38,211,0.45)] transition-shadow duration-300 disabled:opacity-60"
                  >
                    {isSaving ? (
                      <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</>
                    ) : (
                      <><Download className="w-4 h-4" /> Save MP3</>
                    )}
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleReset}
                    className="flex items-center gap-1.5 px-4 h-10 rounded-xl bg-white/8 border border-white/10 text-white/70 hover:text-white hover:bg-white/12 text-sm font-medium transition-colors duration-200"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    New
                  </motion.button>
                </div>
              </motion.div>
            )}

            {/* ERROR */}
            {error && !isPending && (
              <motion.div
                key="error"
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                className="relative overflow-hidden rounded-2xl border border-destructive/20 bg-destructive/5 backdrop-blur-xl p-6 space-y-4"
              >
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-lg bg-destructive/15 border border-destructive/30 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <AlertCircle className="w-4 h-4 text-destructive" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-white mb-1">
                      {isPlaylist ? "Playlist load failed" : "Extraction failed"}
                    </p>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {getErrorMessage(error)}
                    </p>
                  </div>
                </div>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleReset}
                  className="flex items-center gap-1.5 px-4 h-9 rounded-xl bg-white/8 border border-white/10 text-white/80 hover:text-white hover:bg-white/12 text-sm font-medium transition-colors duration-200"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Try again
                </motion.button>
              </motion.div>
            )}

          </AnimatePresence>
        </div>
      </main>

      <footer className="pb-6 text-center text-xs text-muted-foreground/40 relative z-10">
        Built with yt-dlp
      </footer>
    </div>
  );
}
