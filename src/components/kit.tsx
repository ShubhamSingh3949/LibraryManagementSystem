import { X } from "lucide-react";
import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode } from "react";
import { useEffect } from "react";
import { cn } from "@/lib/utils";
import type { SpaceStatus } from "@/lib/types";

/* ---------- Button ---------- */

type Variant = "primary" | "soft" | "outline" | "ghost" | "danger";
type Size = "sm" | "md";

export function Button({
  variant = "outline",
  size = "md",
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: Size }) {
  const variants: Record<Variant, string> = {
    primary:
      "bg-brand text-primary-foreground hover:brightness-105 shadow-[0_10px_18px_-10px_var(--brand)]",
    soft: "bg-brand-soft/70 text-accent-foreground hover:bg-brand-soft",
    outline: "bg-card border border-line text-foreground hover:bg-background",
    ghost: "text-muted-foreground hover:bg-background",
    danger: "bg-maint text-primary-foreground hover:brightness-105",
  };
  return (
    <button
      type={props.type || "button"}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-2xl font-semibold transition disabled:pointer-events-none disabled:opacity-50",
        size === "sm" ? "h-8 px-3 text-xs" : "h-10 px-4 text-sm",
        variants[variant],
        className,
      )}
      {...props}
    />
  );
}

/* ---------- Card ---------- */

export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cn("clay-card p-5", className)}>{children}</div>;
}

export function CardTitle({
  title,
  subtitle,
  right,
}: {
  title: string;
  subtitle?: string;
  right?: ReactNode;
}) {
  return (
    <div className="mb-4 flex items-start justify-between gap-3">
      <div>
        <h2 className="font-display text-lg font-semibold">{title}</h2>
        {subtitle && <p className="mt-0.5 text-xs text-muted-foreground">{subtitle}</p>}
      </div>
      {right}
    </div>
  );
}

/* ---------- Badge ---------- */

export type Tone = "brand" | "avail" | "occ" | "resv" | "maint" | "neutral";

const toneMap: Record<Tone, string> = {
  brand: "bg-brand/12 text-brand",
  avail: "bg-avail/12 text-avail",
  occ: "bg-occ/12 text-occ",
  resv: "bg-resv/15 text-resv",
  maint: "bg-maint/12 text-maint",
  neutral: "bg-muted text-muted-foreground",
};

export function Badge({
  tone = "neutral",
  children,
  className,
}: {
  tone?: Tone;
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold whitespace-nowrap",
        toneMap[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

export const statusTone: Record<SpaceStatus, Tone> = {
  available: "avail",
  occupied: "occ",
  reserved: "resv",
  maintenance: "maint",
};

export const statusLabel: Record<SpaceStatus, string> = {
  available: "Available",
  occupied: "Occupied",
  reserved: "Reserved",
  maintenance: "Maintenance",
};

/* ---------- Inputs ---------- */

export function Field({
  label,
  children,
  hint,
}: {
  label: string;
  children: ReactNode;
  hint?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-semibold text-muted-foreground">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-[11px] text-muted-foreground">{hint}</span>}
    </label>
  );
}

const fieldBase =
  "w-full rounded-2xl border border-line bg-card px-3.5 py-2.5 text-sm outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20 placeholder:text-muted-foreground/70";

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn(fieldBase, className)} {...props} />;
}

export function Textarea({
  className,
  ...props
}: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cn(fieldBase, "min-h-20", className)} {...props} />;
}

export function Select({
  className,
  children,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select className={cn(fieldBase, "appearance-none pr-8", className)} {...props}>
      {children}
    </select>
  );
}

/* ---------- Modal & Drawer ---------- */

function useEscape(onClose: () => void, open: boolean) {
  useEffect(() => {
    if (!open) return;
    const fn = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", fn);
    return () => window.removeEventListener("keydown", fn);
  }, [onClose, open]);
}

export function Modal({
  open,
  onClose,
  title,
  subtitle,
  children,
  footer,
  wide,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
  wide?: boolean;
}) {
  useEscape(onClose, open);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-foreground/30 p-4 backdrop-blur-[2px] sm:p-8">
      <div
        className={cn(
          "clay-card my-auto w-full p-6 shadow-[var(--shadow-clay-lg)]",
          wide ? "max-w-3xl" : "max-w-lg",
        )}
      >
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <h2 className="font-display text-xl font-semibold">{title}</h2>
            {subtitle && <p className="mt-1 text-xs text-muted-foreground">{subtitle}</p>}
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="grid size-9 place-items-center rounded-2xl text-muted-foreground hover:bg-background"
          >
            <X className="size-4" />
          </button>
        </div>
        {children}
        {footer && <div className="mt-6 flex justify-end gap-2">{footer}</div>}
      </div>
    </div>
  );
}

export function Drawer({
  open,
  onClose,
  title,
  subtitle,
  children,
  footer,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  useEscape(onClose, open);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-foreground/25 backdrop-blur-[2px]">
      <div className="flex h-full w-full max-w-[420px] flex-col border-l border-line bg-card shadow-[var(--shadow-clay-lg)]">
        <div className="flex items-start justify-between gap-3 border-b border-line px-5 py-4">
          <div>
            <p className="text-[10px] font-bold tracking-[0.18em] text-muted-foreground uppercase">
              {subtitle}
            </p>
            <h2 className="font-display text-xl font-semibold">{title}</h2>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="grid size-9 place-items-center rounded-2xl text-muted-foreground hover:bg-background"
          >
            <X className="size-4" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-5">{children}</div>
        {footer && <div className="border-t border-line p-4">{footer}</div>}
      </div>
    </div>
  );
}

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = "Confirm",
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <Modal open={open} onClose={onCancel} title={title}>
      <p className="text-sm text-muted-foreground">{message}</p>
      <div className="mt-6 flex justify-end gap-2">
        <Button onClick={onCancel}>Cancel</Button>
        <Button variant="danger" onClick={onConfirm}>
          {confirmLabel}
        </Button>
      </div>
    </Modal>
  );
}

/* ---------- Misc ---------- */

export function EmptyState({ title, message }: { title: string; message: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-line px-6 py-10 text-center">
      <p className="font-display text-base font-semibold">{title}</p>
      <p className="mt-1 text-xs text-muted-foreground">{message}</p>
    </div>
  );
}

export function Avatar({ name, className }: { name: string; className?: string }) {
  const letters = name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
  return (
    <span
      className={cn(
        "grid size-9 shrink-0 place-items-center rounded-xl bg-brand-soft font-display text-xs font-bold text-accent-foreground",
        className,
      )}
    >
      {letters}
    </span>
  );
}

export function Progress({ value, tone = "avail" }: { value: number; tone?: Tone }) {
  const bg: Record<Tone, string> = {
    brand: "bg-brand",
    avail: "bg-avail",
    occ: "bg-occ",
    resv: "bg-resv",
    maint: "bg-maint",
    neutral: "bg-muted-foreground",
  };
  return (
    <div className="h-3 overflow-hidden rounded-full bg-muted">
      <div
        className={cn("h-full rounded-full", bg[tone])}
        style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
      />
    </div>
  );
}

export function PageHeader({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="font-display text-2xl font-semibold">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}
