import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// -----------------------------------------------------------------------------
// Día de la semana utilities
// -----------------------------------------------------------------------------

/**
 * Orden canonico de los dias de la semana usandolo para ordenar.
 */
export const DAY_ORDER = [
  "Lunes",
  "Martes",
  "Miércoles",
  "Jueves",
  "Viernes",
  "Sábado",
  "Domingo",
] as const;

/**
 * Devuelve un nuevo array con los dias ordenados segun el orden de la semana.
 */
export function sortDays(days: string[]): string[] {
  return [...days].sort(
    (a, b) => DAY_ORDER.indexOf(a as (typeof DAY_ORDER)[number]) - DAY_ORDER.indexOf(b as (typeof DAY_ORDER)[number])
  );
}

// -----------------------------------------------------------------------------
// Formateo de strings de dias y horarios
// -----------------------------------------------------------------------------

export function formatDays(days: string[]): string {
  if (days.length === 0) return "Sin días definidos";

  const ordered = sortDays(days);

  if (ordered.length === 1) return ordered[0];
  if (ordered.length === 2) return `${ordered[0]} y ${ordered[1]}`;
  return `${ordered.slice(0, -1).join(", ")} y ${ordered[ordered.length - 1]}`;
}

export function formatSchedule(days: string[], start: string, end: string): string {
  if (days.length === 0 || !start || !end) return "";
  return `${formatDays(days)} ${start}-${end}`;
}

// -----------------------------------------------------------------------------
// Detección de "Hoy" / "Mañana"
// -----------------------------------------------------------------------------

export function getDayStatus(day: string): "today" | "tomorrow" | "other" {
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  
  const dayMap: Record<string, number> = {
    Domingo: 0,
    Lunes: 1,
    Martes: 2,
    Miércoles: 3,
    Jueves: 4,
    Viernes: 5,
    Sábado: 6,
  };

  const dayNumber = dayMap[day.trim()];
  if (dayNumber === undefined) return "other";

  if (today.getDay() === dayNumber) return "today";
  if (tomorrow.getDay() === dayNumber) return "tomorrow";
  return "other";
}

export function formatClassDays(days: string[], forUserView: boolean = false): string {
  const cleaned = days.map((d) => d.trim()).filter(Boolean);
  if (!forUserView) return formatDays(cleaned);

  for (const day of cleaned) {
    const status = getDayStatus(day);
    if (status === "today") return "Hoy";
    if (status === "tomorrow") return "Mañana";
  }

  // Ningún caso especial
  return sortDays(cleaned)[0] || "Sin días definidos";
}

// -----------------------------------------------------------------------------
// Parsing del string de horario de la BD
// -----------------------------------------------------------------------------

export function parseSchedule(schedule: string) {
  if (!schedule) return { days: [], start: "", end: "" };

  // Ejemplo de formato esperado: "Lunes, Jueves y Viernes 19:00-20:30" o "Martes y Jueves 19:00-20:00"
  const match = schedule.match(/^(.+?)\s+(\d{2}:\d{2})-(\d{2}:\d{2})$/);
  if (match) {
    const [, daysStr, start, end] = match;
    // Dividir por coma o por " y " (con espacios a ambos lados) y limpiar espacios
    const days = daysStr
      .split(/,\s*|\s+y\s+/)
      .map((d) => d.trim())
      .filter(Boolean);
    return { days, start, end };
  }

  return { days: [], start: "", end: "" };
}
