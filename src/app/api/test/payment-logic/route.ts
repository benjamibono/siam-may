import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { supabase } from "@/lib/supabase";

// Función modificada para testing que acepta un día específico
function getNewUserStatusTest(
  currentStatus: string,
  hasCurrentMonthPayment: boolean,
  dayOfMonth: number
): string {
  // Si tiene pago del mes actual, siempre activo
  if (hasCurrentMonthPayment) {
    return "active";
  }

  // Si no tiene pago del mes actual, determinar estado según el día del mes
  if (dayOfMonth >= 15) {
    // A partir del día 15, suspender automáticamente si no hay pago
    return "suspended";
  } else if (dayOfMonth >= 1 && dayOfMonth <= 5) {
    // Del día 1 al 5, estado pending (período de gracia)
    return "pending";
  } else {
    // Del día 6 al 14, mantener pending pero sin poder inscribirse
    return "pending";
  }
}

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

export async function POST(request: NextRequest) {
  const user = await verifyAdminOrStaff(request);
  if (!user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  try {
    const { simulateDay } = await request.json();

    if (!simulateDay || simulateDay < 1 || simulateDay > 31) {
      return NextResponse.json(
        { error: "Día inválido (1-31)" },
        { status: 400 }
      );
    }

    console.log(
      `[TEST] Simulando lógica de pagos para el día ${simulateDay} del mes`
    );

    // Casos de test predefinidos
    const testCases = [
      // Usuarios sin pago
      {
        currentStatus: "active",
        hasPayment: false,
        description: "Usuario activo sin pago",
      },
      {
        currentStatus: "pending",
        hasPayment: false,
        description: "Usuario pendiente sin pago",
      },
      {
        currentStatus: "suspended",
        hasPayment: false,
        description: "Usuario suspendido sin pago",
      },

      // Usuarios con pago
      {
        currentStatus: "active",
        hasPayment: true,
        description: "Usuario activo con pago",
      },
      {
        currentStatus: "pending",
        hasPayment: true,
        description: "Usuario pendiente con pago",
      },
      {
        currentStatus: "suspended",
        hasPayment: true,
        description: "Usuario suspendido con pago",
      },
    ];

    const results = testCases.map((testCase) => {
      const newStatus = getNewUserStatusTest(
        testCase.currentStatus,
        testCase.hasPayment,
        simulateDay
      );

      return {
        ...testCase,
        newStatus,
        changed: newStatus !== testCase.currentStatus,
        day: simulateDay,
      };
    });

    // Análisis del comportamiento por rangos de días
    let dayRangeAnalysis = "";
    if (simulateDay >= 1 && simulateDay <= 5) {
      dayRangeAnalysis = "Período de gracia - Usuarios sin pago van a PENDING";
    } else if (simulateDay >= 6 && simulateDay <= 14) {
      dayRangeAnalysis =
        "Período de bloqueo - Usuarios sin pago siguen PENDING (sin inscripciones)";
    } else if (simulateDay >= 15) {
      dayRangeAnalysis =
        "Período de suspensión - Usuarios sin pago van a SUSPENDED";
    }

    // Obtener estadísticas de usuarios reales (solo conteo, sin cambios)
    const { data: realUsers, error: usersError } = await supabaseAdmin
      .from("profiles")
      .select("id, status")
      .neq("role", "admin");

    if (usersError) throw usersError;

    const statusCounts = {
      active: realUsers?.filter((u) => u.status === "active").length || 0,
      pending: realUsers?.filter((u) => u.status === "pending").length || 0,
      suspended: realUsers?.filter((u) => u.status === "suspended").length || 0,
    };

    return NextResponse.json({
      success: true,
      simulatedDay: simulateDay,
      dayRangeAnalysis,
      testResults: results,
      currentUserStats: statusCounts,
      summary: {
        totalTests: results.length,
        changesExpected: results.filter((r) => r.changed).length,
        message: `Simulación completada para el día ${simulateDay}. ${dayRangeAnalysis}`,
      },
      instructions: {
        "días 1-5": "Usuarios sin pago → PENDING (pueden inscribirse)",
        "días 6-14": "Usuarios sin pago → PENDING (NO pueden inscribirse)",
        "días 15+": "Usuarios sin pago → SUSPENDED",
        "cualquier día": "Usuarios con pago → ACTIVE",
      },
    });
  } catch (error) {
    console.error("[TEST] Error in payment logic test:", error);
    return NextResponse.json(
      { error: "Error en test de lógica de pagos" },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  const user = await verifyAdminOrStaff(request);
  if (!user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  // Test rápido de todos los días del mes
  const allDaysTest = [];

  for (let day = 1; day <= 31; day++) {
    const testCase = { currentStatus: "active", hasPayment: false };
    const newStatus = getNewUserStatusTest(
      testCase.currentStatus,
      testCase.hasPayment,
      day
    );

    allDaysTest.push({
      day,
      userWithoutPayment: newStatus,
      userWithPayment: "active", // Siempre activo si tiene pago
    });
  }

  return NextResponse.json({
    success: true,
    message: "Test completo de lógica de pagos por día del mes",
    results: allDaysTest,
    patterns: {
      "días 1-5": "Sin pago → PENDING",
      "días 6-14": "Sin pago → PENDING",
      "días 15-31": "Sin pago → SUSPENDED",
      "cualquier día": "Con pago → ACTIVE",
    },
  });
}
