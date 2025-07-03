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
 * Solo resetea clases que han terminado en las últimas 2 horas
 */
export function shouldResetClass(schedule: string): boolean {
  const { days, start: startTime, end: endTime } = parseSchedule(schedule);

  if (days.length === 0 || !startTime || !endTime) {
    return false;
  }

  // Usar hora de Madrid/España en lugar de UTC
  const now = new Date();
  const madridTime = new Date(now.toLocaleString("en-US", {timeZone: "Europe/Madrid"}));
  const currentDay = madridTime.getDay();

  const dayMappings: { [key: string]: number } = {
    Domingo: 0,
    Lunes: 1,
    Martes: 2,
    Miércoles: 3,
    Jueves: 4,
    Viernes: 5,
    Sábado: 6,
  };

  // Convertir días de clase a números
  const classDayNumbers = days
    .map((day) => dayMappings[day])
    .filter((num) => num !== undefined);

  if (classDayNumbers.length === 0) {
    return false;
  }

  // Solo verificar si HOY es día de clase (en hora de Madrid)
  if (!classDayNumbers.includes(currentDay)) {
    return false;
  }

  // Parsear la hora de fin
  const [endHour, endMinute] = endTime.split(':').map(Number);
  
  // Crear fecha/hora de fin para hoy en zona horaria de Madrid
  const endTimeToday = new Date(madridTime);
  endTimeToday.setHours(endHour, endMinute, 0, 0);
  
  const currentDateTime = madridTime.getTime();
  const timeSinceEnd = currentDateTime - endTimeToday.getTime();
  
  // Resetear si la clase terminó hace entre 0 y 2 horas
  const twoHoursInMs = 2 * 60 * 60 * 1000;
  
  return timeSinceEnd > 0 && timeSinceEnd <= twoHoursInMs;
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

