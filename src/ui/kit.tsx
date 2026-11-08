import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { audio } from "@/game/audio";

export function Kbd({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <kbd
      className={cn(
        "inline-flex min-w-[1.6rem] items-center justify-center rounded-md border border-white/40 bg-white/15 px-1.5 py-0.5 font-mono text-[11px] font-semibold text-white shadow-[inset_0_-2px_0_rgba(0,0,0,0.18)]",
        className,
      )}
    >
      {children}
    </kbd>
  );
}

type BtnProps = ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "secondary" | "ghost" | "dark"; size?: "md" | "lg" | "sm" };

export const Button = forwardRef<HTMLButtonElement, BtnProps>(function Button({ variant = "secondary", size = "md", className, onClick, ...rest }, ref) {
  return (
    <button
      ref={ref}
      onClick={(e) => {
        audio.play("click");
        onClick?.(e);
      }}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-full font-mono font-semibold tracking-wide transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#f2735a] disabled:opacity-40",
        size === "lg" && "px-7 py-3.5 text-sm",
        size === "md" && "px-5 py-2.5 text-xs",
        size === "sm" && "px-3.5 py-1.5 text-[11px]",
        variant === "primary" && "bg-[#f2735a] text-white shadow-[0_8px_24px_-8px_rgba(217,87,63,0.8)] hover:bg-[#e8624a] hover:-translate-y-0.5",
        variant === "secondary" && "bg-white/85 text-[#1f3552] shadow-sm ring-1 ring-[#1f3552]/10 hover:bg-white hover:-translate-y-0.5",
        variant === "ghost" && "text-[#1f3552] hover:bg-[#1f3552]/5",
        variant === "dark" && "bg-[#1f3552]/80 text-white ring-1 ring-white/15 backdrop-blur hover:bg-[#1f3552]",
        className,
      )}
      {...rest}
    />
  );
});

export function IconButton({ label, className, children, onClick, ...rest }: ButtonHTMLAttributes<HTMLButtonElement> & { label: string }) {
  return (
    <button
      aria-label={label}
      title={label}
      {...rest}
      onClick={(e) => {
        audio.play("click");
        onClick?.(e);
      }}
      className={cn(
        "grid h-10 w-10 place-items-center rounded-full bg-[#1f3552]/55 text-white ring-1 ring-white/20 backdrop-blur-md transition hover:bg-[#1f3552]/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ffcf70]",
        className,
      )}
    >
      {children}
    </button>
  );
}

export function Label({ children, className, color }: { children: ReactNode; className?: string; color?: string }) {
  return (
    <span className={cn("font-mono text-[10px] font-semibold uppercase tracking-[0.22em]", className)} style={color ? { color } : undefined}>
      {children}
    </span>
  );
}

export function Glass({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("rounded-2xl bg-[#fbf6ec]/90 shadow-[0_20px_60px_-20px_rgba(31,53,82,0.45)] ring-1 ring-[#1f3552]/10 backdrop-blur-xl", className)}>{children}</div>;
}

export function Chip({ children, color }: { children: ReactNode; color?: string }) {
  return (
    <span
      className="inline-flex items-center rounded-full border px-2.5 py-1 font-mono text-[11px] text-[#1f3552]/80"
      style={{ borderColor: color ? `${color}55` : "rgba(31,53,82,0.15)", backgroundColor: color ? `${color}12` : undefined }}
    >
      {children}
    </span>
  );
}
