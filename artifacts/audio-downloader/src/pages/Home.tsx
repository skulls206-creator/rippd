import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Download, Music, RefreshCw, AlertCircle } from "lucide-react";
import { useDownloadAudio, type DownloadAudioMutationError } from "@workspace/api-client-react";
import { Header } from "@/components/Header";
import { PremiumInput } from "@/components/PremiumInput";
import { PremiumButton } from "@/components/PremiumButton";
import { AudioWave } from "@/components/AudioWave";

export default function Home() {
  const [url, setUrl] = useState("");
  const { mutate, isPending, data, error, reset } = useDownloadAudio();
  const [loadingText, setLoadingText] = useState("Extracting audio...");

  useEffect(() => {
    if (!isPending) return;
    
    const texts = [
      "Extracting audio...",
      "Downloading highest quality...",
      "Converting to MP3...",
      "Applying metadata...",
      "Almost there...",
      "Just a few more seconds..."
    ];
    
    let i = 0;
    const interval = setInterval(() => {
      i = (i + 1) % texts.length;
      setLoadingText(texts[i]);
    }, 4000);
    
    return () => clearInterval(interval);
  }, [isPending]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) return;
    mutate({ data: { url: url.trim() } });
  };

  const getErrorMessage = (err: DownloadAudioMutationError): string => {
    const data = err?.data;
    if (data && typeof data === "object" && "error" in data && typeof data.error === "string") {
      return data.error;
    }
    return err?.message ?? "Failed to process the URL. Please make sure it's valid and try again.";
  };

  return (
    <div className="min-h-screen flex flex-col relative overflow-hidden">
      {/* Background Mesh Image */}
      <div 
        className="absolute inset-0 z-0 bg-mesh opacity-30 mix-blend-screen pointer-events-none"
        style={{ backgroundImage: `url('${import.meta.env.BASE_URL}images/bg-mesh.png')` }}
      />
      
      <Header />

      <main className="flex-1 flex items-center justify-center p-4 relative z-10 mt-20">
        <div className="w-full max-w-2xl mx-auto">
          
          <AnimatePresence mode="wait">
            
            {/* STATE: IDLE */}
            {!isPending && !data && !error && (
              <motion.div
                key="idle"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.5 }}
                className="text-center space-y-8"
              >
                <div className="space-y-4">
                  <h1 className="text-5xl md:text-7xl font-extrabold text-transparent bg-clip-text bg-gradient-to-br from-white to-white/60">
                    Rip the audio.
                  </h1>
                  <p className="text-lg md:text-xl text-muted-foreground max-w-lg mx-auto">
                    Paste any YouTube or SoundCloud link to instantly download the highest quality MP3 directly to your device.
                  </p>
                </div>

                <form onSubmit={handleSubmit} className="glass-panel p-6 md:p-8 rounded-[2rem] space-y-6">
                  <PremiumInput
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    placeholder="https://youtube.com/watch?v=..."
                    type="url"
                    required
                  />
                  <PremiumButton 
                    type="submit" 
                    className="w-full"
                    disabled={!url.trim()}
                  >
                    <Download className="w-5 h-5" />
                    Extract Audio
                  </PremiumButton>
                </form>
              </motion.div>
            )}

            {/* STATE: LOADING */}
            {isPending && (
              <motion.div
                key="loading"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 1.05 }}
                className="glass-panel p-10 md:p-16 rounded-[2.5rem] flex flex-col items-center justify-center text-center space-y-8"
              >
                <AudioWave />
                <div className="space-y-2">
                  <h3 className="text-2xl font-display font-bold text-white">
                    {loadingText}
                  </h3>
                  <p className="text-muted-foreground">
                    Please don't close this tab. This might take up to a minute depending on track length.
                  </p>
                </div>
              </motion.div>
            )}

            {/* STATE: SUCCESS */}
            {data && !isPending && (
              <motion.div
                key="success"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="glass-panel p-8 md:p-12 rounded-[2.5rem] flex flex-col items-center text-center space-y-8 relative overflow-hidden"
              >
                {/* Decorative success glow */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-64 bg-primary/20 blur-[100px] rounded-full pointer-events-none" />
                
                <div className="w-20 h-20 bg-gradient-to-br from-primary to-accent rounded-full flex items-center justify-center shadow-[0_0_40px_rgba(192,38,211,0.5)]">
                  <Music className="w-10 h-10 text-white" />
                </div>
                
                <div className="space-y-3 w-full">
                  <p className="text-sm font-bold text-primary tracking-widest uppercase">READY TO DOWNLOAD</p>
                  <h3 className="text-2xl md:text-3xl font-display font-bold text-white truncate px-4" title={data.title}>
                    {data.title}
                  </h3>
                </div>

                <div className="flex flex-col w-full gap-4 sm:flex-row sm:justify-center">
                  <a 
                    href={`/api/download/file/${data.token}`} 
                    download={data.filename}
                    className="w-full sm:w-auto"
                  >
                    <PremiumButton className="w-full">
                      <Download className="w-5 h-5" />
                      Save MP3
                    </PremiumButton>
                  </a>
                  
                  <PremiumButton 
                    variant="secondary" 
                    onClick={() => {
                      reset();
                      setUrl("");
                    }}
                  >
                    <RefreshCw className="w-5 h-5" />
                    Convert Another
                  </PremiumButton>
                </div>
              </motion.div>
            )}

            {/* STATE: ERROR */}
            {error && !isPending && (
              <motion.div
                key="error"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="glass-panel border-destructive/30 p-8 md:p-12 rounded-[2.5rem] flex flex-col items-center text-center space-y-8 relative overflow-hidden"
              >
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-64 bg-destructive/20 blur-[100px] rounded-full pointer-events-none" />
                
                <div className="w-20 h-20 bg-destructive/20 border border-destructive/50 rounded-full flex items-center justify-center">
                  <AlertCircle className="w-10 h-10 text-destructive" />
                </div>
                
                <div className="space-y-3 max-w-md">
                  <h3 className="text-2xl font-display font-bold text-white">Extraction Failed</h3>
                  <p className="text-muted-foreground">
                    {getErrorMessage(error)}
                  </p>
                </div>

                <PremiumButton 
                  variant="outline" 
                  onClick={() => {
                    reset();
                  }}
                  className="border-white/20 text-white hover:bg-white/10"
                >
                  <RefreshCw className="w-5 h-5" />
                  Try Again
                </PremiumButton>
              </motion.div>
            )}
            
          </AnimatePresence>
          
        </div>
      </main>

      <footer className="py-6 text-center text-sm text-muted-foreground relative z-10">
        <p>Built with yt-dlp &bull; For personal use only</p>
      </footer>
    </div>
  );
}
