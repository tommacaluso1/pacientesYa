import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { formatDistanceToNowStrict, format } from "date-fns";
import { es } from "date-fns/locale";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function timeAgo(iso: string | null | undefined) {
  if (!iso) return "—";
  return formatDistanceToNowStrict(new Date(iso), { addSuffix: true, locale: es });
}

export function fmtDateTime(iso: string | null | undefined) {
  if (!iso) return "—";
  return format(new Date(iso), "dd/MM/yyyy HH:mm", { locale: es });
}

export function calcEdad(fechaNac?: string | null): number | null {
  if (!fechaNac) return null;
  const dob = new Date(fechaNac);
  const diff = Date.now() - dob.getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24 * 365.2425));
}

// Whole calendar days between admission and now. Day-of-admission is day 0.
// Returns null if ingreso_at is missing or in the future.
export function daysOfStay(ingresoAt: string | null | undefined): number | null {
  if (!ingresoAt) return null;
  const start = new Date(ingresoAt);
  if (Number.isNaN(start.getTime())) return null;
  const ms = Date.now() - start.getTime();
  if (ms < 0) return null;
  return Math.floor(ms / (1000 * 60 * 60 * 24));
}

export function triageWeight(t: "rojo" | "amarillo" | "verde") {
  return t === "rojo" ? 0 : t === "amarillo" ? 1 : 2;
}
