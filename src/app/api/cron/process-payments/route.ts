import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { getCurrentMonthYear, getNewUserStatus } from "@/lib/payment-logic";

// Esta función se ejecuta diariamente a las 00:00h
export async function GET(request: NextRequest) {
  // Verificar que la request viene de Vercel Cron
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  try {
    const { data: users, error: usersError } = await supabaseAdmin
      .from("profiles")
      .select("*")
      .neq("status", "suspended")
      .in("role", ["user"]);

    if (usersError) throw usersError;

    const results = {
      checked: users?.length || 0,
      updated: 0,
      suspended: 0,
      errors: 0,
    };

    if (!users || users.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No hay usuarios para procesar",
        ...results,
      });
    }

    // Procesar cada usuario
    for (const userProfile of users) {
      try {
        const { month, year } = getCurrentMonthYear();

        // Verificar si el usuario tiene pagos válidos este mes
        const { data: payments, error: paymentsError } = await supabaseAdmin
          .from("payments")
          .select("*")
          .eq("user_id", userProfile.id)
          .gte(
            "payment_date",
            `${year}-${month.toString().padStart(2, "0")}-01`
          )
          .lt(
            "payment_date",
            `${year}-${(month + 1).toString().padStart(2, "0")}-01`
          );

        if (paymentsError) {
          results.errors++;
          continue;
        }

        const newStatus = getNewUserStatus(
          userProfile.status,
          payments && payments.length > 0,
          userProfile.role
        );

        // Solo actualizar si el estado cambió
        if (newStatus !== userProfile.status) {
          const { error: updateError } = await supabaseAdmin
            .from("profiles")
            .update({ status: newStatus })
            .eq("id", userProfile.id);

          if (updateError) {
            results.errors++;
            continue;
          }

          results.updated++;

          // Si el usuario fue suspendido, cerrar su sesión
          if (newStatus === "suspended") {
            try {
              await supabaseAdmin.auth.admin.signOut(userProfile.id);
              results.suspended++;
            } catch {
              // Ignore sign out errors
            }
          }
        }
      } catch {
        results.errors++;
      }
    }

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      message: "Procesamiento completado",
      ...results,
    });
  } catch {
    return NextResponse.json(
      {
        error: "Error processing user statuses",
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
