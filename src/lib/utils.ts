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

export function triageWeight(t: "rojo" | "amarillo" | "verde") {
  return t === "rojo" ? 0 : t === "amarillo" ? 1 : 2;
}
