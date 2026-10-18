import { cn } from "@/lib/utils";

export function LogoMark({ className }: { className?: string }) {
  return (
    <div className={cn("relative grid size-9 place-items-center rounded-xl bg-brand-gradient shadow-glow", className)}>
      <svg viewBox="0 0 24 24" className="size-5 text-primary-foreground" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="3.5" y="3.5" width="17" height="17" rx="5" />
        <circle cx="12" cy="12" r="3.8" />
        <path d="M17 6.8l.01 0" strokeLinecap="round" strokeWidth="2.6" />
      </svg>
    </div>
  );
}

export function Logo({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <LogoMark />
      <div className="leading-none">
        <div className="font-display text-[15px] font-bold tracking-tight">InstaStudio</div>
        <div className="text-brand-gradient text-[11px] font-bold tracking-[0.2em]">AI</div>
      </div>
    </div>
  );
}
