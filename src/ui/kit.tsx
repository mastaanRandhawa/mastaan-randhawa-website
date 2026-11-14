import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";
import { ChevronLeft, ChevronRight, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { audio } from "@/game/audio";

/**
 * Skybound UI primitives, "livery" design system: cream paper, navy ink and a
 * coral accent (the aircraft's paint scheme), Nunito for reading and labels,
 * Zain for names and titles, Azeret Mono only for instrument readouts.
 *
 * The key names below are kept from the earlier system so call sites read the
 * same; the values are the livery palette.
 */
export const SYSTEM = {
  blue: "#2b5c8a",
  blueDark: "#6fb7e0",
  green: "#3f8f5a",
  orange: "#c8553d",
  red: "#c0392b",
  yellow: "#b8862b",
  indigo: "#1f3552",
  purple: "#6d55c4",
  pink: "#b8507a",
  teal: "#2f8f8a",
  gray: "#7d8593",
  label: "#1f3552",
  secondary: "#5d6b80",
  grouped: "#f3ecdf",
};

/** Livery colours for components that need them directly. */
export const INK = "#1f3552";
export const INK_SOFT = "#5d6b80";
export const PAPER = "#fbf6ec";
export const CORAL = "#f2735a";
/** Coral dark enough for small text on paper (AA). */
export const CORAL_TEXT = "#b4442c";

type IconType = LucideIcon;

/** Keycap with a mono legend. */
export function Kbd({ children, className }: { children: ReactNode; className?: string }) {
  return <kbd className={cn("keycap", className)}>{children}</kbd>;
}

type BtnProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "filled" | "paper" | "tinted" | "gray" | "glass" | "plain" | "destructive";
  size?: "lg" | "md" | "sm";
};

export const Button = forwardRef<HTMLButtonElement, BtnProps>(function Button({ variant = "gray", size = "md", className, onClick, ...rest }, ref) {
  return (
    <button
      ref={ref}
      onClick={(e) => {
        audio.play("click");
        onClick?.(e);
      }}
      className={cn(
        "font-sf inline-flex select-none items-center justify-center gap-2 font-semibold tracking-[-0.01em] transition-[background-color,color,box-shadow,transform,opacity] duration-150 ease-out active:translate-y-px focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-[#f2735a]/55 disabled:opacity-40 disabled:active:translate-y-0",
        size === "lg" && "h-[50px] rounded-[10px] px-6 text-[16px]",
        size === "md" && "h-11 rounded-[9px] px-5 text-[14.5px]",
        size === "sm" && "hit-area h-8 rounded-[7px] px-3 text-[13px]",
        // Ink button with a coral keel line: the primary action.
        variant === "filled" && "bg-[var(--ink)] text-[var(--paper)] shadow-[inset_0_-3px_0_var(--coral),0_8px_20px_-10px_rgba(31,53,82,0.8)] hover:bg-[var(--ink-hover)]",
        // Paper button for dark backdrops (primary action over the scene).
        variant === "paper" && "bg-[var(--paper)] text-[var(--ink)] shadow-[inset_0_-3px_0_var(--coral),0_10px_28px_-12px_rgba(0,0,0,0.6)] hover:bg-white hover:shadow-[inset_0_-4px_0_var(--coral),0_14px_30px_-12px_rgba(0,0,0,0.65)]",
        variant === "tinted" && "bg-[#1f3552]/[0.07] text-[#1f3552] shadow-[inset_0_0_0_1px_rgba(31,53,82,0.16)] hover:bg-[#1f3552]/[0.11]",
        variant === "gray" && "bg-transparent text-[#1f3552] shadow-[inset_0_0_0_1px_rgba(31,53,82,0.22)] hover:bg-[#1f3552]/[0.05]",
        variant === "glass" && "mat-glass hover:bg-[rgba(20,31,49,0.6)]",
        variant === "plain" && "text-[#2b5c8a] underline-offset-4 hover:underline",
        variant === "destructive" && "text-[#c0392b] underline-offset-4 hover:underline",
        className,
      )}
      {...rest}
    />
  );
});

/** Square-shouldered button used on instrument glass over the scene. */
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
        "hit-area grid h-9 w-9 place-items-center rounded-[7px] text-[#f4ead5]/85 transition-[background-color,color,transform] duration-150 hover:bg-[#f4ead5]/10 hover:text-[#fbf6ec] active:translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f2735a]",
        className,
      )}
    >
      {children}
    </button>
  );
}

/** Small tracked legend. */
export function Label({ children, className, color }: { children: ReactNode; className?: string; color?: string }) {
  return (
    <span className={cn("legend", className)} style={color ? { color } : undefined}>
      {children}
    </span>
  );
}

/** Paper sheet surface. */
export function Glass({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("font-sf mat-light rounded-[16px]", className)}>{children}</div>;
}

/** Tag: ink outline with an optional colour key. */
export function Chip({ children, color }: { children: ReactNode; color?: string }) {
  return (
    <span className="font-sf inline-flex items-center rounded-[5px] bg-[#fffdf8] px-2 py-[3px] text-[12px] font-medium text-[#33425a] shadow-[inset_0_0_0_1px_rgba(31,53,82,0.16)]">
      {color && <span className="mr-1.5 h-2 w-2 rounded-[2px]" style={{ backgroundColor: color }} />}
      {children}
    </span>
  );
}

/** Stamp-style icon: tinted square with a fine outline, icon drawn in the colour. */
export function IconTile({ icon: Icon, color, size = 29, className }: { icon: IconType; color: string; size?: number; className?: string }) {
  return (
    <span
      className={cn("grid shrink-0 place-items-center", className)}
      style={{ width: size, height: size, borderRadius: Math.max(5, size * 0.2), backgroundColor: `${color}17`, boxShadow: `inset 0 0 0 1px ${color}40`, color }}
    >
      <Icon size={Math.round(size * 0.54)} strokeWidth={1.9} />
    </span>
  );
}

/** Toggle with a square-shouldered track. */
export function Switch({ value, onChange, label }: { value: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button
      role="switch"
      aria-checked={value}
      aria-label={label}
      onClick={() => {
        audio.play("click");
        onChange(!value);
      }}
      className={cn(
        "hit-area relative h-[26px] w-[46px] shrink-0 rounded-[7px] transition-colors duration-200 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-[#f2735a]/55",
        value ? "bg-[#1f3552]" : "bg-[#1f3552]/[0.12]",
      )}
    >
      <span
        className="absolute left-[3px] top-[3px] h-5 w-5 rounded-[5px] bg-[#fbf6ec] shadow-[0_1px_3px_rgba(16,24,38,0.3)] transition-transform duration-200 ease-out"
        style={{ transform: `translateX(${value ? 20 : 0}px)` }}
      >
        {value && <span className="absolute inset-x-[7px] top-[5px] h-[10px] rounded-full bg-[#f2735a]" />}
      </span>
    </button>
  );
}

export function Segmented<T extends string>({ value, options, onChange, label }: { value: T; options: { v: T; l: string }[]; onChange: (v: T) => void; label: string }) {
  return (
    <div role="radiogroup" aria-label={label} className="font-sf flex rounded-[8px] p-[2px] shadow-[inset_0_0_0_1px_rgba(31,53,82,0.18)]">
      {options.map((o) => (
        <button
          key={o.v}
          role="radio"
          aria-checked={value === o.v}
          onClick={() => {
            audio.play("click");
            onChange(o.v);
          }}
          className={cn(
            "hit-area min-w-[3.2rem] rounded-[6px] px-2.5 py-[5px] text-[12.5px] font-medium transition-colors focus-visible:outline-offset-0",
            value === o.v ? "bg-[#1f3552] text-[#fbf6ec]" : "text-[#1f3552]/75 hover:text-[#1f3552]",
          )}
        >
          {o.l}
        </button>
      ))}
    </div>
  );
}

export function Slider({ value, onChange, label, min = 0, max = 1, step = 0.05 }: { value: number; onChange: (v: number) => void; label: string; min?: number; max?: number; step?: number }) {
  const fill = `${((value - min) / (max - min)) * 100}%`;
  return (
    <input
      type="range"
      aria-label={label}
      min={min}
      max={max}
      step={step}
      value={value}
      onChange={(e) => onChange(Number(e.target.value))}
      className="ios-slider w-40"
      style={{ ["--fill" as string]: fill }}
    />
  );
}

/** Ruled section with a mono legend header. */
export function Group({ header, footer, children, className }: { header?: ReactNode; footer?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={cn("font-sf", className)}>
      {header && <h3 className="ios-group-header">{header}</h3>}
      <div className="ios-group">{children}</div>
      {footer && <p className="ios-group-footer">{footer}</p>}
    </section>
  );
}

/** Row in a ruled list: optional stamp icon, title/subtitle, accessory. */
export function Row({
  icon,
  color = SYSTEM.blue,
  title,
  subtitle,
  value,
  accessory,
  chevron,
  onClick,
  tone,
  href,
}: {
  icon?: IconType;
  color?: string;
  title: ReactNode;
  subtitle?: ReactNode;
  value?: ReactNode;
  accessory?: ReactNode;
  chevron?: boolean;
  onClick?: () => void;
  tone?: "blue" | "red";
  href?: string;
}) {
  const inner = (
    <>
      {icon && <IconTile icon={icon} color={color} />}
      <div className="min-w-0 flex-1 py-[11px]">
        <div className={cn("text-[15.5px] font-medium leading-tight", tone === "blue" && "text-[#2b5c8a]", tone === "red" && "text-[#c0392b]", !tone && "text-[#1f3552]")}>{title}</div>
        {subtitle && <div className="mt-0.5 text-[12.5px] leading-snug text-[#5d6b80]">{subtitle}</div>}
      </div>
      {value !== undefined && <span className="font-instrument shrink-0 text-[13px] text-[#5d6b80]">{value}</span>}
      {accessory}
      {chevron && <ChevronRight size={16} className="shrink-0 text-[#1f3552]/35" strokeWidth={2.2} />}
    </>
  );
  const cls = "flex min-h-[46px] w-full items-center gap-3 px-3.5 text-left focus-visible:outline-offset-[-2px]";
  if (href)
    return (
      <a href={href} target={href.startsWith("mailto") ? undefined : "_blank"} rel="noopener noreferrer" className={cn(cls, "transition hover:bg-[#1f3552]/[0.035] active:bg-[#1f3552]/[0.06]")}>
        {inner}
      </a>
    );
  if (onClick)
    return (
      <button
        onClick={() => {
          audio.play("click");
          onClick();
        }}
        className={cn(cls, "transition hover:bg-[#1f3552]/[0.035] active:bg-[#1f3552]/[0.06]")}
      >
        {inner}
      </button>
    );
  return <div className={cls}>{inner}</div>;
}

/** Sheet header: back, centred title, trailing Done. */
export function NavBar({ title, onBack, backLabel = "Back", onDone, doneLabel = "Done" }: { title?: ReactNode; onBack?: () => void; backLabel?: string; onDone?: () => void; doneLabel?: string }) {
  return (
    <div className="font-sf relative flex h-12 items-center justify-between px-2">
      {onBack ? (
        <button onClick={onBack} className="hit-area flex items-center gap-0.5 rounded-[7px] px-1.5 py-1 text-[14.5px] font-medium text-[#1f3552] transition-colors hover:bg-[#1f3552]/[0.06] active:bg-[#1f3552]/[0.1]">
          <ChevronLeft size={20} strokeWidth={2.2} className="-ml-0.5" /> {backLabel}
        </button>
      ) : (
        <span />
      )}
      {title && <span className="legend pointer-events-none absolute inset-x-0 text-center text-[#5d6b80]">{title}</span>}
      {onDone ? (
        <button onClick={onDone} className="hit-area rounded-[7px] bg-[var(--ink)] px-3 py-1 text-[13.5px] font-semibold text-[var(--paper)] shadow-[inset_0_-2px_0_var(--coral)] transition-colors hover:bg-[var(--ink-hover)] active:translate-y-px">
          {doneLabel}
        </button>
      ) : (
        <span />
      )}
    </div>
  );
}
