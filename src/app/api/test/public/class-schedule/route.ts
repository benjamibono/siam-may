import { NextRequest, NextResponse } from "next/server";

// Copia de las funciones de class-schedule para testing
interface ClassSchedule {
  days: string[];
  startTime: string;
  endTime: string;
}

function parseClassScheduleTest(schedule: string): ClassSchedule {
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

function getNextClassDayTest(schedule: string): string {
  const { days, startTime, endTime } = parseClassScheduleTest(schedule);

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

function shouldResetClassTest(schedule: string): boolean {
  const { days, endTime } = parseClassScheduleTest(schedule);

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

export async function POST(request: NextRequest) {
  try {
    const { testSchedule } = await request.json();

    if (!testSchedule) {
      return NextResponse.json(
        { error: "testSchedule requerido" },
        { status: 400 }
      );
    }

    console.log(`[PUBLIC TEST] Testing schedule: ${testSchedule}`);

    // Parsear el horario
    const parsed = parseClassScheduleTest(testSchedule);

    // Tests básicos
    const testResults = {
      schedule: testSchedule,
      parsed: parsed,
      nextClassDay: getNextClassDayTest(testSchedule),
      shouldReset: shouldResetClassTest(testSchedule),
      currentTime: new Date().toISOString(),
      currentDay: new Date().toLocaleDateString("es-ES", { weekday: "long" }),
      tests: {
        validFormat:
          parsed.days.length > 0 && parsed.startTime && parsed.endTime,
        hasValidDays: parsed.days.every((day) =>
          [
            "Domingo",
            "Lunes",
            "Martes",
            "Miércoles",
            "Jueves",
            "Viernes",
            "Sábado",
          ].includes(day)
        ),
        hasValidTimes:
          /^\d{1,2}:\d{2}$/.test(parsed.startTime) &&
          /^\d{1,2}:\d{2}$/.test(parsed.endTime),
      },
    };

    return NextResponse.json({
      success: true,
      primaryTest: testResults,
      summary: {
        message: `Test completado para horario: ${testSchedule}`,
        valid: testResults.tests.validFormat,
        nextClass: testResults.nextClassDay,
        shouldReset: testResults.shouldReset,
        currentTime: testResults.currentTime,
      },
    });
  } catch (error) {
    console.error("[PUBLIC TEST] Error in class schedule test:", error);
    return NextResponse.json(
      { error: "Error en test de horarios de clases" },
      { status: 500 }
    );
  }
}

export async function GET() {
  // Tests de diferentes formatos de horario
  const sampleSchedules = [
    "Lunes, Miércoles, Viernes 19:00-20:00",
    "Martes, Jueves 18:30-19:30",
    "Sábado 10:00-11:30",
    "Lunes y Miércoles 20:00-21:00",
    "Domingo 09:00-10:30",
    "Formato inválido",
    "Viernes 25:00-26:00", // Horario inválido
  ];

  const scheduleTests = sampleSchedules.map((schedule) => {
    const parsed = parseClassScheduleTest(schedule);
    const nextClass = getNextClassDayTest(schedule);
    const shouldReset = shouldResetClassTest(schedule);
    const isValid =
      parsed.days.length > 0 && parsed.startTime && parsed.endTime;

    return {
      schedule,
      parsed,
      nextClass,
      shouldReset,
      isValid,
      tests: {
        validFormat: isValid,
        hasValidDays: parsed.days.every((day) =>
          [
            "Domingo",
            "Lunes",
            "Martes",
            "Miércoles",
            "Jueves",
            "Viernes",
            "Sábado",
          ].includes(day)
        ),
        hasValidTimes:
          /^\d{1,2}:\d{2}$/.test(parsed.startTime) &&
          /^\d{1,2}:\d{2}$/.test(parsed.endTime),
      },
    };
  });

  // Simular diferentes horas del día para ver cómo cambia "próxima clase"
  const timeSimulations = [
    "09:00",
    "12:00",
    "15:00",
    "18:00",
    "19:30",
    "21:00",
    "23:00",
  ];

  return NextResponse.json({
    success: true,
    message: "Test completo de formatos de horarios de clases",
    currentTime: new Date().toISOString(),
    currentDay: new Date().toLocaleDateString("es-ES", { weekday: "long" }),
    scheduleFormatTests: scheduleTests,
    timeSimulations: timeSimulations.map((time) => ({
      simulatedTime: time,
      note: "Para simulación completa de tiempo, se requiere modificar las funciones base",
    })),
    summary: {
      totalSchedules: scheduleTests.length,
      validSchedules: scheduleTests.filter((s) => s.isValid).length,
      invalidSchedules: scheduleTests.filter((s) => !s.isValid).length,
      schedulesToReset: scheduleTests.filter((s) => s.shouldReset).length,
    },
    patterns: {
      validFormats: [
        "Lunes, Miércoles 19:00-20:00",
        "Martes y Jueves 18:30-19:30",
        "Sábado 10:00-11:30",
      ],
      invalidFormats: [
        "Sin horario",
        "Horario 25:00-26:00",
        "Formato incorrecto",
      ],
    },
  });
}
