import { motion } from "framer-motion";

export function AudioWave() {
  return (
    <div className="flex items-center justify-center gap-1.5 h-12">
      {[1, 2, 3, 4, 5].map((i) => (
        <motion.div
          key={i}
          className="w-1.5 bg-gradient-to-t from-primary to-accent rounded-full"
          animate={{ 
            height: ["20%", "100%", "20%"],
            opacity: [0.5, 1, 0.5]
          }}
          transition={{
            duration: 0.8,
            repeat: Infinity,
            ease: "easeInOut",
            delay: i * 0.15,
          }}
        />
      ))}
    </div>
  );
}
