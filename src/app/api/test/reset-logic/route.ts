import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import {
  shouldResetClass,
  getClassesToReset,
  parseClassSchedule,
} from "@/lib/class-schedule";

export async function GET() {
  try {
    // Obtener todas las clases
    const { data: classes, error: classesError } = await supabaseAdmin
      .from("classes")
      .select("id, name, schedule");

    if (classesError) throw classesError;

    const now = new Date();
    const currentTime = now.toTimeString().substring(0, 5);
    const currentDay = now.toLocaleDateString("es-ES", { weekday: "long" });
    const currentDayCapitalized =
      currentDay.charAt(0).toUpperCase() + currentDay.slice(1);

    // Analizar cada clase
    const classAnalysis = (classes || []).map((cls) => {
      const parsed = parseClassSchedule(cls.schedule);
      const shouldReset = shouldResetClass(cls.schedule);

      return {
        id: cls.id,
        name: cls.name,
        schedule: cls.schedule,
        parsed,
        shouldReset,
        isToday: parsed.days.includes(currentDayCapitalized),
        endTime: parsed.endTime,
        hasEnded:
          parsed.days.includes(currentDayCapitalized) &&
          currentTime > parsed.endTime,
        reasoning: {
          isScheduledToday: parsed.days.includes(currentDayCapitalized),
          currentTime: currentTime,
          classEndTime: parsed.endTime,
          timeComparison: currentTime > parsed.endTime ? "después" : "antes",
          shouldResetExplanation: shouldReset
            ? "SÍ - Es día de clase y ya pasó la hora de fin"
            : "NO - O no es día de clase o aún no termina",
        },
      };
    });

    // Obtener clases que se resetearían
    const classesToReset = getClassesToReset(classes || []);

    return NextResponse.json({
      success: true,
      timestamp: now.toISOString(),
      currentInfo: {
        date: now.toLocaleDateString("es-ES"),
        time: currentTime,
        day: currentDayCapitalized,
      },
      analysis: classAnalysis,
      summary: {
        totalClasses: classes?.length || 0,
        classesToReset: classesToReset.length,
        classesToResetIds: classesToReset,
        classesToResetNames: classAnalysis
          .filter((cls) => classesToReset.includes(cls.id))
          .map((cls) => cls.name),
      },
      verification: {
        correctBehavior: classAnalysis.every(
          (cls) => cls.shouldReset === cls.hasEnded
        ),
        message: "El sistema solo resetea clases que han terminado hoy",
      },
    });
  } catch (error) {
    console.error("[TEST] Error testing reset logic:", error);
    return NextResponse.json(
      { error: "Error al probar lógica de reset" },
      { status: 500 }
    );
  }
}

// POST para simular diferentes horarios
export async function POST(request: NextRequest) {
  try {
    const { simulateDay, simulateTime } = await request.json();

    if (!simulateDay || !simulateTime) {
      return NextResponse.json(
        { error: "Necesitas simulateDay y simulateTime" },
        { status: 400 }
      );
    }

    // Obtener todas las clases
    const { data: classes, error: classesError } = await supabaseAdmin
      .from("classes")
      .select("id, name, schedule");

    if (classesError) throw classesError;

    // Simular la lógica con el día y hora proporcionados
    const simulatedAnalysis = (classes || []).map((cls) => {
      const parsed = parseClassSchedule(cls.schedule);

      // Simular shouldResetClass con datos personalizados
      const isSimulatedDay = parsed.days.includes(simulateDay);
      const hasEndedAtSimulatedTime = simulateTime > parsed.endTime;
      const wouldReset = isSimulatedDay && hasEndedAtSimulatedTime;

      return {
        id: cls.id,
        name: cls.name,
        schedule: cls.schedule,
        parsed,
        wouldReset,
        simulationDetails: {
          isScheduledOnSimulatedDay: isSimulatedDay,
          simulatedTime: simulateTime,
          classEndTime: parsed.endTime,
          hasEndedAtSimulatedTime: hasEndedAtSimulatedTime,
          explanation: wouldReset
            ? `SÍ resetearía - Es ${simulateDay} y ${simulateTime} > ${parsed.endTime}`
            : `NO resetearía - ${
                !isSimulatedDay
                  ? `No es ${simulateDay}`
                  : `${simulateTime} <= ${parsed.endTime}`
              }`,
        },
      };
    });

    const classesToResetInSimulation = simulatedAnalysis
      .filter((cls) => cls.wouldReset)
      .map((cls) => cls.id);

    return NextResponse.json({
      success: true,
      simulation: {
        day: simulateDay,
        time: simulateTime,
      },
      analysis: simulatedAnalysis,
      summary: {
        totalClasses: classes?.length || 0,
        wouldResetCount: classesToResetInSimulation.length,
        wouldResetNames: simulatedAnalysis
          .filter((cls) => cls.wouldReset)
          .map((cls) => cls.name),
      },
    });
  } catch (error) {
    console.error("[TEST] Error in simulation:", error);
    return NextResponse.json({ error: "Error en simulación" }, { status: 500 });
  }
}
