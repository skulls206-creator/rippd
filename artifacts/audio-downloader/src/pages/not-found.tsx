import { motion } from "framer-motion";
import { Link } from "wouter";
import { Home } from "lucide-react";
import { PremiumButton } from "@/components/PremiumButton";

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      <div 
        className="absolute inset-0 z-0 bg-mesh opacity-20 mix-blend-screen pointer-events-none"
        style={{ backgroundImage: `url('${import.meta.env.BASE_URL}images/bg-mesh.png')` }}
      />
      
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="glass-panel p-12 rounded-[3rem] text-center max-w-md w-full relative z-10"
      >
        <h1 className="text-8xl font-display font-bold text-transparent bg-clip-text bg-gradient-to-b from-white to-white/20 mb-6">
          404
        </h1>
        <h2 className="text-2xl font-bold text-foreground mb-4">Track Not Found</h2>
        <p className="text-muted-foreground mb-8">
          The page you're looking for has been removed or doesn't exist.
        </p>
        
        <Link href="/">
          <PremiumButton variant="primary" className="w-full">
            <Home className="w-5 h-5 mr-2" />
            Back to Downloader
          </PremiumButton>
        </Link>
      </motion.div>
    </div>
  );
}
