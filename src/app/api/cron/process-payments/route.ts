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
    console.log(
      `[CRON] Iniciando procesamiento automático de estados - ${new Date().toISOString()}`
    );

    // Obtener todos los usuarios (excepto admin)
    const { data: users, error: usersError } = await supabaseAdmin
      .from("profiles")
      .select("id, status, role")
      .neq("role", "admin");

    if (usersError) throw usersError;

    const { month, year } = getCurrentMonthYear();
    let processedCount = 0;
    let updatedCount = 0;
    const updates = [];

    for (const userProfile of users || []) {
      processedCount++;

      // Verificar si tiene pagos del mes actual
      const { data: payments, error: paymentsError } = await supabaseAdmin
        .from("payments")
        .select("payment_date")
        .eq("user_id", userProfile.id)
        .gte("payment_date", `${year}-${month.toString().padStart(2, "0")}-01`)
        .lt(
          "payment_date",
          `${year}-${(month + 1).toString().padStart(2, "0")}-01`
        );

      if (paymentsError) {
        console.error(
          `[CRON] Error checking payments for user ${userProfile.id}:`,
          paymentsError
        );
        continue;
      }

      const hasCurrentMonthPayment = payments && payments.length > 0;
      const newStatus = getNewUserStatus(
        userProfile.status,
        hasCurrentMonthPayment
      );

      // Solo actualizar si el estado ha cambiado
      if (newStatus !== userProfile.status) {
        const { error: updateError } = await supabaseAdmin
          .from("profiles")
          .update({
            status: newStatus as "active" | "suspended" | "pending",
            updated_at: new Date().toISOString(),
          })
          .eq("id", userProfile.id);

        if (updateError) {
          console.error(
            `[CRON] Error updating status for user ${userProfile.id}:`,
            updateError
          );
        } else {
          updatedCount++;
          updates.push({
            userId: userProfile.id,
            oldStatus: userProfile.status,
            newStatus: newStatus,
            hasPayment: hasCurrentMonthPayment,
          });

          console.log(
            `[CRON] Updated user ${userProfile.id} from ${userProfile.status} to ${newStatus}`
          );

          // Si se suspende la cuenta, cerrar sesiones activas
          if (newStatus === "suspended") {
            try {
              await supabaseAdmin.auth.admin.signOut(userProfile.id, "global");
              console.log(`[CRON] Signed out suspended user ${userProfile.id}`);
            } catch (signOutError) {
              console.error(
                `[CRON] Error signing out user ${userProfile.id}:`,
                signOutError
              );
            }
          }
        }
      }
    }

    const result = {
      success: true,
      timestamp: new Date().toISOString(),
      processed: processedCount,
      updated: updatedCount,
      updates: updates,
      message: `Procesados ${processedCount} usuarios, ${updatedCount} actualizados`,
    };

    console.log(`[CRON] Procesamiento completado:`, result);

    return NextResponse.json(result);
  } catch (error) {
    console.error("[CRON] Error processing user statuses:", error);
    return NextResponse.json(
      {
        error: "Error en procesamiento automático",
        timestamp: new Date().toISOString(),
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

// También permitir POST para testing manual
export async function POST(request: NextRequest) {
  return GET(request);
}
