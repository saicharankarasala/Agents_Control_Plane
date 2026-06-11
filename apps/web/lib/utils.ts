import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function fmtCost(n: number | null | undefined): string {
  if (n == null) return "$0.00";
  if (n < 0.01) return `$${n.toFixed(4)}`;
  return `$${n.toFixed(2)}`;
}

export function fmtNum(n: number | null | undefined): string {
  if (n == null) return "0";
  return n.toLocaleString();
}

export function fmtMs(n: number | null | undefined): string {
  if (n == null) return "0ms";
  if (n >= 1000) return `${(n / 1000).toFixed(2)}s`;
  return `${n}ms`;
}

export function relTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  // Timestamps without an explicit timezone are UTC — append 'Z' so the
  // browser doesn't misread them as local time.
  const norm = /[zZ]|[+-]\d{2}:?\d{2}$/.test(iso) ? iso : `${iso}Z`;
  const d = new Date(norm);
  const s = Math.floor((Date.now() - d.getTime()) / 1000);
  if (s < 5) return "just now";
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}
