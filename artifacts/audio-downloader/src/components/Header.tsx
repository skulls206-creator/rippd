import { Disc3 } from "lucide-react";
import { Link } from "wouter";

export function Header() {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 p-6 flex justify-between items-center bg-background/50 backdrop-blur-md border-b border-white/5">
      <Link href="/" className="flex items-center gap-3 group">
        <div className="relative">
          <div className="absolute inset-0 bg-primary blur-md opacity-50 group-hover:opacity-80 transition-opacity rounded-full" />
          <Disc3 className="w-8 h-8 text-primary relative z-10 animate-[spin_4s_linear_infinite]" />
        </div>
        <span className="font-display font-bold text-xl tracking-wider text-white">
          RIPP<span className="text-primary">D</span>
        </span>
      </Link>
    </header>
  );
}
