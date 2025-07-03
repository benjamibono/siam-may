import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { getClassesToReset } from "@/lib/class-schedule";

// Esta función se ejecuta para reiniciar clases que han terminado
export async function GET(request: NextRequest) {
  // Verificar que la request viene de Vercel Cron
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  try {
    const now = new Date();
    const currentTime = now.toTimeString().substring(0, 5);
    const currentDay = now.toLocaleDateString("es-ES", { weekday: "long" });
    const currentDayCapitalized = currentDay.charAt(0).toUpperCase() + currentDay.slice(1);

    // También obtener hora de Madrid para debug
    const madridTime = new Date(now.toLocaleString("en-US", {timeZone: "Europe/Madrid"}));
    const madridTimeString = madridTime.toTimeString().substring(0, 5);
    const madridDay = madridTime.toLocaleDateString("es-ES", { weekday: "long" });
    const madridDayCapitalized = madridDay.charAt(0).toUpperCase() + madridDay.slice(1);

    // Obtener todas las clases
    const { data: classes, error: classesError } = await supabaseAdmin
      .from("classes")
      .select("id, name, schedule");

    if (classesError) throw classesError;

    if (!classes || classes.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No hay clases para verificar",
        timestamp: new Date().toISOString(),
        debug: {
          currentTime,
          currentDay: currentDayCapitalized,
          madridTime: madridTimeString,
          madridDay: madridDayCapitalized,
        },
      });
    }

    // Obtener clases que deberían reiniciarse
    const classesToReset = getClassesToReset(classes);

    // Crear información de debug para todas las clases
    const classesDebugInfo = classes.map((cls) => ({
      id: cls.id,
      name: cls.name,
      schedule: cls.schedule,
      shouldReset: classesToReset.includes(cls.id),
    }));

    if (classesToReset.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No hay clases que necesiten reiniciarse",
        timestamp: new Date().toISOString(),
        debug: {
          currentTime,
          currentDay: currentDayCapitalized,
          madridTime: madridTimeString,
          madridDay: madridDayCapitalized,
          totalClasses: classes.length,
          classesInfo: classesDebugInfo,
        },
      });
    }

    let resetCount = 0;
    const resetDetails = [];
    const errors = [];

    // Reiniciar cada clase (vaciar inscripciones)
    for (const classId of classesToReset) {
      const classInfo = classes.find((c) => c.id === classId);

      try {
        // Contar inscripciones antes de eliminar
        const { count: enrollmentCount } = await supabaseAdmin
          .from("class_enrollments")
          .select("*", { count: "exact", head: true })
          .eq("class_id", classId);

        // Eliminar todas las inscripciones de esta clase
        const { error: deleteError } = await supabaseAdmin
          .from("class_enrollments")
          .delete()
          .eq("class_id", classId);

        if (deleteError) {
          errors.push({
            classId,
            className: classInfo?.name || "Desconocida",
            error: deleteError.message,
          });
          continue;
        }

        resetCount++;
        resetDetails.push({
          classId,
          className: classInfo?.name || "Desconocida",
          schedule: classInfo?.schedule || "",
          enrollmentsRemoved: enrollmentCount || 0,
          resetAt: new Date().toISOString(),
        });
      } catch (error) {
        errors.push({
          classId,
          className: classInfo?.name || "Desconocida",
          error: error instanceof Error ? error.message : "Error desconocido",
        });
      }
    }

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      debug: {
        currentTime,
        currentDay: currentDayCapitalized,
        madridTime: madridTimeString,
        madridDay: madridDayCapitalized,
        totalClasses: classes.length,
        classesEligibleForReset: classesToReset.length,
        classesInfo: classesDebugInfo,
      },
      totalClasses: classes.length,
      classesChecked: classes.length,
      classesReset: resetCount,
      resetDetails,
      errors: errors.length > 0 ? errors : undefined,
      message: `${resetCount} clases reiniciadas de ${classesToReset.length} elegibles`,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: "Error en reinicio automático de clases",
        details: error instanceof Error ? error.message : "Error desconocido",
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

// También permitir POST para testing manual
export async function POST(request: NextRequest) {
  return GET(request);
}
