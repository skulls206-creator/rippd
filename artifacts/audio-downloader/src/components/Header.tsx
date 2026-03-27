import { Link } from "wouter";

export function Header() {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 p-6 flex justify-between items-center bg-background/50 backdrop-blur-md border-b border-white/5">
      <Link href="/" className="flex items-center gap-3 group">
        <div className="relative w-8 h-8">
          <div className="absolute inset-0 bg-primary blur-md opacity-40 group-hover:opacity-70 transition-opacity rounded-full" />
          <img
            src={`${import.meta.env.BASE_URL}logo.png`}
            alt="RIPPD logo"
            className="w-8 h-8 object-contain relative z-10"
          />
        </div>
        <span className="font-display font-bold text-xl tracking-wider text-white">
          RIPP<span className="text-primary">D</span>
        </span>
      </Link>
    </header>
  );
}
