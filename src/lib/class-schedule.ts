// Lógica de horarios y reinicio automático de clases

interface ClassSchedule {
  days: string[];
  startTime: string;
  endTime: string;
}

/**
 * Parsea un horario de clase del formato "Lunes, Miércoles 19:00-20:00"
 */
export function parseClassSchedule(schedule: string): ClassSchedule {
  const timeRegex = /(\d{1,2}:\d{2})-(\d{1,2}:\d{2})/;
  const timeMatch = schedule.match(timeRegex);

  if (!timeMatch) {
    return { days: [], startTime: "", endTime: "" };
  }

  const [, startTime, endTime] = timeMatch;
  const daysText = schedule.replace(timeRegex, "").trim().replace(/,$/, "");
  const days = daysText
    .split(/,\s*(?:y\s+)?/)
    .map((day) => day.trim())
    .filter(Boolean);

  return { days, startTime, endTime };
}

/**
 * Obtiene el próximo día de clase desde hoy
 */
export function getNextClassDay(schedule: string): string {
  const { days, startTime, endTime } = parseClassSchedule(schedule);

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
      return `Hoy ${startTime}-${endTime}`;
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
    return `Mañana ${startTime}-${endTime}`;
  } else if (daysToAdd <= 6) {
    return `Próximo ${nextDayName} ${startTime}-${endTime}`;
  } else {
    return `${nextDayName} ${startTime}-${endTime}`;
  }
}

/**
 * Verifica si una clase ha terminado y debería reiniciarse
 */
export function shouldResetClass(schedule: string): boolean {
  const { days, endTime } = parseClassSchedule(schedule);

  if (days.length === 0 || !endTime) {
    return false;
  }

  const now = new Date();
  const today = now.getDay();
  const currentTime = now.toTimeString().substring(0, 5);

  // const dayMappings: { [key: string]: number } = {
  //   Domingo: 0,
  //   Lunes: 1,
  //   Martes: 2,
  //   Miércoles: 3,
  //   Jueves: 4,
  //   Viernes: 5,
  //   Sábado: 6,
  // };

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

/**
 * Calcula el tiempo restante hasta la próxima clase
 */
export function getTimeUntilNextClass(schedule: string): string {
  const { days, startTime } = parseClassSchedule(schedule);

  if (days.length === 0 || !startTime) {
    return "";
  }

  const now = new Date();
  const today = now.getDay();
  const currentTime = now.toTimeString().substring(0, 5);

  // const dayMappings: { [key: string]: number } = {
  //   Domingo: 0,
  //   Lunes: 1,
  //   Martes: 2,
  //   Miércoles: 3,
  //   Jueves: 4,
  //   Viernes: 5,
  //   Sábado: 6,
  // };

  const dayNames = [
    "Domingo",
    "Lunes",
    "Martes",
    "Miércoles",
    "Jueves",
    "Viernes",
    "Sábado",
  ];

  // Si hoy es día de clase y aún no empieza
  const todayName = dayNames[today];
  if (days.includes(todayName) && currentTime < startTime) {
    const [currentHour, currentMinute] = currentTime.split(":").map(Number);
    const [startHour, startMinute] = startTime.split(":").map(Number);

    const currentMinutes = currentHour * 60 + currentMinute;
    const startMinutes = startHour * 60 + startMinute;
    const diffMinutes = startMinutes - currentMinutes;

    if (diffMinutes < 60) {
      return `En ${diffMinutes} minutos`;
    } else {
      const hours = Math.floor(diffMinutes / 60);
      const minutes = diffMinutes % 60;
      return `En ${hours}h ${minutes}m`;
    }
  }

  return "";
}
