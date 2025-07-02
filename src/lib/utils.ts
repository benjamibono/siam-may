import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// -----------------------------------------------------------------------------
// Orden de los días de la semana
// -----------------------------------------------------------------------------

const DAY_ORDER = [
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
// Formateo de strings de dias y horarios para Class Management
// -----------------------------------------------------------------------------

export function formatDaysForManagement(days: string[]): string {
  if (days.length === 0) return "Sin días definidos";

  const ordered = sortDays(days);

  if (ordered.length === 1) return ordered[0];
  if (ordered.length === 2) return `${ordered[0]} y ${ordered[1]}`;
  return `${ordered.slice(0, -1).join(", ")} y ${ordered[ordered.length - 1]}`;
}

export function formatScheduleForManagement(days: string[], start: string, end: string): string {
  if (days.length === 0 || !start || !end) return "";
  return `${formatDaysForManagement(days)} ${start} - ${end}`;
}

// -----------------------------------------------------------------------------
// Detección de "Hoy" / "Mañana" para User Classes
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

export function formatClassDaysForUser(days: string[], start: string, end: string): string {
  const cleaned = days.map((d) => d.trim()).filter(Boolean);
  const ordered = sortDays(cleaned);
  
  if (ordered.length === 0 || !start || !end) return "Sin horario definido";

  // Buscar el próximo día de clase (hoy o mañana)
  for (const day of ordered) {
    const status = getDayStatus(day);
    if (status === "today") return `Hoy ${start} - ${end}`;
    if (status === "tomorrow") return `Mañana ${start} - ${end}`;
  }

  // Si no es hoy ni mañana, mostrar el primer día de la semana
  return `${ordered[0]} ${start} - ${end}`;
}

// -----------------------------------------------------------------------------
// Parsing del string de horario de la BD
// -----------------------------------------------------------------------------

export function parseSchedule(schedule: string) {
  if (!schedule) return { days: [], start: "", end: "" };

  // Formato esperado: "Lunes, Jueves y Viernes 19:00 - 20:30" o "Martes y Jueves 19:00-20:00"
  const match = schedule.match(/^(.+?)\s+(\d{2}:\d{2})\s*-\s*(\d{2}:\d{2})$/);
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

// Funciones de compatibilidad (deprecated - usar las específicas arriba)
export function formatDays(days: string[]): string {
  return formatDaysForManagement(days);
}

export function formatSchedule(days: string[], start: string, end: string): string {
  return formatScheduleForManagement(days, start, end);
}

export function formatClassDays(days: string[], forUserView: boolean = false): string {
  if (forUserView) {
    // Para vista de usuario, necesitamos start y end time, pero no los tenemos aquí
    // Esta función está deprecated, usar formatClassDaysForUser directamente
    const cleaned = days.map((d) => d.trim()).filter(Boolean);
    const ordered = sortDays(cleaned);
    
    for (const day of ordered) {
      const status = getDayStatus(day);
      if (status === "today") return "Hoy";
      if (status === "tomorrow") return "Mañana";
    }
    
    return ordered[0] || "Sin días definidos";
  }
  return formatDaysForManagement(days);
}
