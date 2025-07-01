import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { supabase } from "@/lib/supabase";
import {
  getNextClassDay,
  getTimeUntilNextClass,
  shouldResetClass,
  getClassesToReset,
  parseClassSchedule,
} from "@/lib/class-schedule";

async function verifyAdminOrStaff(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (!authHeader) return null;

  const token = authHeader.replace("Bearer ", "");

  try {
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser(token);
    if (error || !user) return null;

    // Verificar que el usuario es admin o staff
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profile?.role !== "admin" && profile?.role !== "staff") return null;

    return user;
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
  } catch (_error) {
    return null;
  }
}

// POST - Test de horarios específicos
export async function POST(request: NextRequest) {
  const user = await verifyAdminOrStaff(request);
  if (!user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  try {
    const { testSchedule, simulateTime } = await request.json();

    if (!testSchedule) {
      return NextResponse.json(
        { error: "testSchedule requerido" },
        { status: 400 }
      );
    }

    console.log(`[TEST] Testing schedule: ${testSchedule}`);
    if (simulateTime) {
      console.log(`[TEST] Simulating time: ${simulateTime}`);
    }

    // Parsear el horario
    const parsed = parseClassSchedule(testSchedule);

    // Tests básicos
    const testResults = {
      schedule: testSchedule,
      parsed: parsed,
      nextClassDay: getNextClassDay(testSchedule),
      timeUntilClass: getTimeUntilNextClass(testSchedule),
      shouldReset: shouldResetClass(testSchedule),
      currentTime: new Date().toISOString(),
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

    // Tests de diferentes formatos de horario
    const sampleSchedules = [
      "Lunes, Miércoles y Viernes 19:00-20:00",
      "Martes y Jueves 18:30-19:30",
      "Sábado 10:00-11:30",
      "Lunes y Miércoles 20:00-21:00",
      "Formato inválido",
      "Viernes 25:00-26:00", // Horario inválido
    ];

    const scheduleTests = sampleSchedules.map((schedule) => ({
      schedule,
      parsed: parseClassSchedule(schedule),
      nextClass: getNextClassDay(schedule),
      shouldReset: shouldResetClass(schedule),
      timeUntil: getTimeUntilNextClass(schedule),
    }));

    return NextResponse.json({
      success: true,
      primaryTest: testResults,
      scheduleFormatTests: scheduleTests,
      summary: {
        message: `Test completado para horario: ${testSchedule}`,
        valid: testResults.tests.validFormat,
        nextClass: testResults.nextClassDay,
        shouldReset: testResults.shouldReset,
      },
    });
  } catch (error) {
    console.error("[TEST] Error in class schedule test:", error);
    return NextResponse.json(
      { error: "Error en test de horarios de clases" },
      { status: 500 }
    );
  }
}

// GET - Test con clases reales de la base de datos
export async function GET(request: NextRequest) {
  const user = await verifyAdminOrStaff(request);
  if (!user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  try {
    // Obtener todas las clases reales
    const { data: classes, error: classesError } = await supabaseAdmin
      .from("classes")
      .select("id, name, schedule");

    if (classesError) throw classesError;

    if (!classes || classes.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No hay clases en la base de datos para testear",
        realClassesTest: [],
      });
    }

    // Test con clases reales
    const realClassesTest = classes.map((cls) => {
      const parsed = parseClassSchedule(cls.schedule);
      const nextClass = getNextClassDay(cls.schedule);
      const timeUntil = getTimeUntilNextClass(cls.schedule);
      const shouldReset = shouldResetClass(cls.schedule);

      return {
        id: cls.id,
        name: cls.name,
        schedule: cls.schedule,
        parsed,
        nextClass,
        timeUntil,
        shouldReset,
        isValid: parsed.days.length > 0 && parsed.startTime && parsed.endTime,
      };
    });

    // Obtener clases que deberían reiniciarse
    const classesToReset = getClassesToReset(classes);

    // Simular diferentes horas del día
    const timeSimulations = [
      "09:00",
      "12:00",
      "15:00",
      "18:00",
      "19:30",
      "21:00",
      "23:00",
    ].map((time) => {
      const classesAtThisTime = classes.map((cls) => ({
        name: cls.name,
        schedule: cls.schedule,
        nextClass: getNextClassDay(cls.schedule),
        // Nota: Para una simulación completa, necesitaríamos modificar
        // las funciones para aceptar una hora simulada
      }));

      return {
        simulatedTime: time,
        classes: classesAtThisTime,
      };
    });

    return NextResponse.json({
      success: true,
      message: `Test completado con ${classes.length} clases reales`,
      currentTime: new Date().toISOString(),
      realClassesTest,
      classesToReset: {
        count: classesToReset.length,
        classIds: classesToReset,
        details: classesToReset.map((id) => {
          const cls = classes.find((c) => c.id === id);
          return {
            id,
            name: cls?.name || "Desconocida",
            schedule: cls?.schedule || "",
          };
        }),
      },
      timeSimulations,
      summary: {
        totalClasses: classes.length,
        validSchedules: realClassesTest.filter((c) => c.isValid).length,
        invalidSchedules: realClassesTest.filter((c) => !c.isValid).length,
        classesToResetNow: classesToReset.length,
      },
    });
  } catch (error) {
    console.error("[TEST] Error in real classes test:", error);
    return NextResponse.json(
      { error: "Error en test de clases reales" },
      { status: 500 }
    );
  }
}
