import { NextRequest, NextResponse } from "next/server";

// Función de test que acepta un día específico (copia de la lógica principal)
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

// Función para verificar si puede inscribirse según el estado y día
function canEnrollInClassesTest(
  userStatus: string,
  dayOfMonth: number
): boolean {
  switch (userStatus) {
    case "active":
      return true;
    case "pending":
      // Del día 1 al 5 pueden inscribirse como pendientes
      return dayOfMonth >= 1 && dayOfMonth <= 5;
    case "suspended":
      return false;
    default:
      return false;
  }
}

export async function POST(request: NextRequest) {
  try {
    const { simulateDay } = await request.json();

    if (!simulateDay || simulateDay < 1 || simulateDay > 31) {
      return NextResponse.json(
        { error: "Día inválido (1-31)" },
        { status: 400 }
      );
    }

    console.log(
      `[PUBLIC TEST] Simulando lógica de pagos para el día ${simulateDay} del mes`
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

      const canEnroll = canEnrollInClassesTest(newStatus, simulateDay);

      return {
        ...testCase,
        newStatus,
        canEnroll,
        changed: newStatus !== testCase.currentStatus,
        day: simulateDay,
      };
    });

    // Análisis del comportamiento por rangos de días
    let dayRangeAnalysis = "";
    let enrollmentRules = "";

    if (simulateDay >= 1 && simulateDay <= 5) {
      dayRangeAnalysis = "Período de gracia - Usuarios sin pago van a PENDING";
      enrollmentRules = "PENDING puede inscribirse, ACTIVE puede inscribirse";
    } else if (simulateDay >= 6 && simulateDay <= 14) {
      dayRangeAnalysis =
        "Período de bloqueo - Usuarios sin pago siguen PENDING (sin inscripciones)";
      enrollmentRules =
        "PENDING NO puede inscribirse, ACTIVE puede inscribirse";
    } else if (simulateDay >= 15) {
      dayRangeAnalysis =
        "Período de suspensión - Usuarios sin pago van a SUSPENDED";
      enrollmentRules =
        "SUSPENDED NO puede inscribirse, ACTIVE puede inscribirse";
    }

    return NextResponse.json({
      success: true,
      simulatedDay: simulateDay,
      dayRangeAnalysis,
      enrollmentRules,
      testResults: results,
      summary: {
        totalTests: results.length,
        changesExpected: results.filter((r) => r.changed).length,
        usersWhoCanEnroll: results.filter((r) => r.canEnroll).length,
        message: `Simulación completada para el día ${simulateDay}. ${dayRangeAnalysis}`,
      },
      logicRules: {
        "días 1-5": "Sin pago → PENDING (pueden inscribirse)",
        "días 6-14": "Sin pago → PENDING (NO pueden inscribirse)",
        "días 15+": "Sin pago → SUSPENDED (NO pueden inscribirse)",
        "cualquier día": "Con pago → ACTIVE (pueden inscribirse)",
      },
    });
  } catch (error) {
    console.error("[PUBLIC TEST] Error in payment logic test:", error);
    return NextResponse.json(
      { error: "Error en test de lógica de pagos" },
      { status: 500 }
    );
  }
}

export async function GET() {
  // Test rápido de todos los días del mes
  const allDaysTest = [];

  for (let day = 1; day <= 31; day++) {
    const testCase = { currentStatus: "active", hasPayment: false };
    const newStatus = getNewUserStatusTest(
      testCase.currentStatus,
      testCase.hasPayment,
      day
    );
    const canEnroll = canEnrollInClassesTest(newStatus, day);

    allDaysTest.push({
      day,
      userWithoutPayment: newStatus,
      userWithPayment: "active", // Siempre activo si tiene pago
      canEnrollWithoutPayment: canEnroll,
      canEnrollWithPayment: true,
    });
  }

  return NextResponse.json({
    success: true,
    message: "Test completo de lógica de pagos por día del mes",
    currentDay: new Date().getDate(),
    results: allDaysTest,
    patterns: {
      "días 1-5": "Sin pago → PENDING (puede inscribirse)",
      "días 6-14": "Sin pago → PENDING (NO puede inscribirse)",
      "días 15-31": "Sin pago → SUSPENDED (NO puede inscribirse)",
      "cualquier día": "Con pago → ACTIVE (puede inscribirse)",
    },
    summary: {
      totalDays: 31,
      gracePeriod: "días 1-5",
      blockPeriod: "días 6-14",
      suspensionPeriod: "días 15-31",
    },
  });
}
