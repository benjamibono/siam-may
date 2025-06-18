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
    // const now = new Date(); // Not used in this context
    // Removed unused variables
    // const currentTime = now.toTimeString().substring(0, 5);
    // const currentDay = now.toLocaleDateString("es-ES", { weekday: "long" });
    // const currentDayCapitalized = currentDay.charAt(0).toUpperCase() + currentDay.slice(1);

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
      });
    }

    // Obtener clases que deberían reiniciarse
    const classesToReset = getClassesToReset(classes);

    if (classesToReset.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No hay clases que necesiten reiniciarse",
        timestamp: new Date().toISOString(),
        checked: classes.length,
      });
    }

    let resetCount = 0;
    const resetDetails = [];

    // Reiniciar cada clase (vaciar inscripciones)
    for (const classId of classesToReset) {
      const classInfo = classes.find((c) => c.id === classId);

      try {
        // Eliminar todas las inscripciones de esta clase
        const { error: deleteError } = await supabaseAdmin
          .from("class_enrollments")
          .delete()
          .eq("class_id", classId);

        if (deleteError) {
          continue;
        }

        resetCount++;
        resetDetails.push({
          classId,
          className: classInfo?.name || "Desconocida",
          schedule: classInfo?.schedule || "",
          resetAt: new Date().toISOString(),
        });
      } catch {
        // Skip individual class errors
      }
    }

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      totalClasses: classes.length,
      classesChecked: classes.length,
      classesReset: resetCount,
      resetDetails,
      message: `${resetCount} clases reiniciadas de ${classesToReset.length} elegibles`,
    });
  } catch {
    return NextResponse.json(
      {
        error: "Error en reinicio automático de clases",
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
