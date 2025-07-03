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

/**
 * Verifica si un usuario puede inscribirse en una clase
 * (es decir, si la clase no ha empezado aún considerando la hora de Madrid)
 */
export function canEnrollInClass(days: string[], start: string): boolean {
  const cleaned = days.map((d) => d.trim()).filter(Boolean);
  
  if (cleaned.length === 0 || !start) return false;

  // Usar hora de Madrid/España
  const now = new Date();
  const madridTime = new Date(now.toLocaleString("en-US", {timeZone: "Europe/Madrid"}));
  const currentDay = madridTime.getDay();
  const currentTime = madridTime.toTimeString().substring(0, 5); // HH:MM format

  const dayMappings: { [key: string]: number } = {
    Domingo: 0,
    Lunes: 1,
    Martes: 2,
    Miércoles: 3,
    Jueves: 4,
    Viernes: 5,
    Sábado: 6,
  };

  const dayNames = [
    "Domingo",
    "Lunes",
    "Martes",
    "Miércoles",
    "Jueves",
    "Viernes",
    "Sábado",
  ];

  // Convertir días de clase a números
  const classDayNumbers = cleaned
    .map((day) => dayMappings[day])
    .filter((num) => num !== undefined);

  if (classDayNumbers.length === 0) {
    return false;
  }

  // Verificar si hoy es día de clase
  const todayName = dayNames[currentDay];
  if (cleaned.includes(todayName)) {
    // Si hoy es día de clase, solo permitir inscripción si no ha empezado
    return currentTime < start;
  }

  // Si hoy no es día de clase, siempre se puede inscribir
  return true;
}

/**
 * Obtiene el próximo día de clase disponible considerando la hora de Madrid
 * Si la clase de hoy ya empezó, muestra la siguiente opción disponible
 */
export function getNextAvailableClassTime(days: string[], start: string, end: string): string {
  const cleaned = days.map((d) => d.trim()).filter(Boolean);
  const ordered = sortDays(cleaned);
  
  if (ordered.length === 0 || !start || !end) return "Sin horario definido";

  // Usar hora de Madrid/España
  const now = new Date();
  const madridTime = new Date(now.toLocaleString("en-US", {timeZone: "Europe/Madrid"}));
  const currentDay = madridTime.getDay();
  const currentTime = madridTime.toTimeString().substring(0, 5); // HH:MM format

  const dayMappings: { [key: string]: number } = {
    Domingo: 0,
    Lunes: 1,
    Martes: 2,
    Miércoles: 3,
    Jueves: 4,
    Viernes: 5,
    Sábado: 6,
  };

  const dayNames = [
    "Domingo",
    "Lunes",
    "Martes",
    "Miércoles",
    "Jueves",
    "Viernes",
    "Sábado",
  ];

  // Convertir días de clase a números
  const classDayNumbers = ordered
    .map((day) => dayMappings[day])
    .filter((num) => num !== undefined);

  if (classDayNumbers.length === 0) {
    return "Sin horario definido";
  }

  // Verificar si hoy es día de clase y aún no ha empezado
  const todayName = dayNames[currentDay];
  if (ordered.includes(todayName) && currentTime < start) {
    return `Hoy ${start} - ${end}`;
  }

  // Si hoy es día de clase pero ya empezó, buscar el siguiente día disponible
  let nextDay = -1;
  let daysToAdd = 1;

  // Buscar en los próximos 7 días
  while (daysToAdd <= 7) {
    const checkDay = (currentDay + daysToAdd) % 7;
    if (classDayNumbers.includes(checkDay)) {
      nextDay = checkDay;
      break;
    }
    daysToAdd++;
  }

  if (nextDay === -1) {
    return "Sin próximas clases";
  }

  const nextDayName = dayNames[nextDay];

  // Formatear la fecha
  if (daysToAdd === 1) {
    return `Mañana ${start} - ${end}`;
  } else if (daysToAdd <= 6) {
    return ` ${nextDayName} ${start} - ${end}`;
  } else {
    return `${nextDayName} ${start} - ${end}`;
  }
}

export function formatClassDaysForUser(days: string[], start: string, end: string): string {
  const cleaned = days.map((d) => d.trim()).filter(Boolean);
  const ordered = sortDays(cleaned);
  
  if (ordered.length === 0 || !start || !end) return "Sin horario definido";

  // Usar la nueva función que considera si la clase ya empezó
  return getNextAvailableClassTime(ordered, start, end);
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
