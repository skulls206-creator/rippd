import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Download, Music2, RotateCcw, AlertCircle, Sparkles, Loader2 } from "lucide-react";
import { useDownloadAudio, type DownloadAudioMutationError } from "@workspace/api-client-react";
import { Header } from "@/components/Header";
import { SearchBar } from "@/components/SearchBar";
import { AudioWave } from "@/components/AudioWave";

const LOADING_TEXTS = [
  "Fetching track info...",
  "Downloading source audio...",
  "Converting to MP3...",
  "Finalising file...",
  "Almost ready...",
];

export default function Home() {
  const [url, setUrl] = useState("");
  const { mutate, isPending, data, error, reset } = useDownloadAudio();
  const [loadingIdx, setLoadingIdx] = useState(0);
  const [isSaving, setIsSaving] = useState(false);

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

  useEffect(() => {
    if (!isPending) { setLoadingIdx(0); return; }
    const id = setInterval(() => setLoadingIdx(i => (i + 1) % LOADING_TEXTS.length), 4000);
    return () => clearInterval(id);
  }, [isPending]);

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!url.trim()) return;
    mutate({ data: { url: url.trim() } });
  };

  const getErrorMessage = (err: DownloadAudioMutationError): string => {
    const d = err?.data;
    if (d && typeof d === "object" && "error" in d && typeof d.error === "string") return d.error;
    return err?.message ?? "Couldn't process that link. Check the URL and try again.";
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
            {!isPending && !data && !error && (
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
                    YouTube · SoundCloud · Spotify · more
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
                    placeholder="Paste a YouTube, SoundCloud, or Spotify link..."
                    type="url"
                    required
                    disabled={isPending}
                    onSubmit={() => handleSubmit()}
                  />
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
                    {LOADING_TEXTS[loadingIdx]}
                  </motion.p>
                  <p className="text-xs text-muted-foreground">
                    Don't close this tab — this can take a minute for longer tracks.
                  </p>
                </div>
              </motion.div>
            )}

            {/* SUCCESS */}
            {data && !isPending && (
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
                    <h3 className="text-sm font-semibold text-white truncate" title={data.title}>
                      {data.title}
                    </h3>
                  </div>
                </div>

                <div className="flex gap-2">
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => handleSave(data.token, data.filename)}
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
                    onClick={() => { reset(); setUrl(""); }}
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
                    <p className="text-sm font-semibold text-white mb-1">Extraction failed</p>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {getErrorMessage(error)}
                    </p>
                  </div>
                </div>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => reset()}
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
