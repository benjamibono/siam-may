// Lógica de horarios y reinicio automático de clases

import { parseSchedule } from "./utils";

/**
 * Obtiene el próximo día de clase desde hoy
 */
export function getNextClassDay(schedule: string): string {
  const { days, start: startTime, end: endTime } = parseSchedule(schedule);

  if (days.length === 0 || !startTime || !endTime) {
    return "Horario no válido";
  }

  const now = new Date();
  const today = now.getDay(); // 0 = Domingo, 1 = Lunes, etc.
  const currentTime = now.toTimeString().substring(0, 5); // HH:MM format

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
  const classDayNumbers = days
    .map((day) => dayMappings[day])
    .filter((num) => num !== undefined)
    .sort((a, b) => a - b);

  if (classDayNumbers.length === 0) {
    return "Días no válidos";
  }

  // Verificar si hoy es día de clase y aún no ha pasado la hora
  const todayName = dayNames[today];
  if (days.includes(todayName) && currentTime < endTime) {
    if (currentTime < startTime) {
      return `Hoy ${startTime} - ${endTime}`;
    } else {
      return `Ahora (hasta ${endTime})`;
    }
  }

  // Buscar el próximo día de clase
  let nextDay = -1;
  let daysToAdd = 1;

  // Buscar en los próximos 7 días
  while (daysToAdd <= 7) {
    const checkDay = (today + daysToAdd) % 7;
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
    return `Mañana ${startTime} - ${endTime}`;
  } else if (daysToAdd <= 6) {
    return `Próximo ${nextDayName} ${startTime} - ${endTime}`;
  } else {
    return `${nextDayName} ${startTime} - ${endTime}`;
  }
}

/**
 * Verifica si una clase ha terminado y debería reiniciarse
 */
export function shouldResetClass(schedule: string): boolean {
  const { days, end: endTime } = parseSchedule(schedule);

  if (days.length === 0 || !endTime) {
    return false;
  }

  const now = new Date();
  const today = now.getDay();
  const currentTime = now.toTimeString().substring(0, 5);

  const dayNames = [
    "Domingo",
    "Lunes",
    "Martes",
    "Miércoles",
    "Jueves",
    "Viernes",
    "Sábado",
  ];
  const todayName = dayNames[today];

  // Si hoy es día de clase y ya pasó la hora de fin
  return days.includes(todayName) && currentTime > endTime;
}

/**
 * Obtiene todas las clases que deberían reiniciarse ahora
 */
export function getClassesToReset(
  classes: Array<{ id: string; schedule: string }>
): string[] {
  return classes
    .filter((cls) => shouldResetClass(cls.schedule))
    .map((cls) => cls.id);
}

