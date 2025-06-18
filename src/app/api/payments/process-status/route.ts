import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { supabase } from "@/lib/supabase";
import {
  getCurrentMonthYear,
  // isPaymentFromCurrentMonth, // Unused import
  getNewUserStatus,
} from "@/lib/payment-logic";

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

// POST - Procesar estados de usuarios automáticamente
export async function POST(request: NextRequest) {
  const user = await verifyAdminOrStaff(request);
  if (!user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  try {
    // Obtener todos los usuarios (excepto admin)
    const { data: users, error: usersError } = await supabaseAdmin
      .from("profiles")
      .select("id, status")
      .neq("role", "admin");

    if (usersError) throw usersError;

    const { month, year } = getCurrentMonthYear();
    let processedCount = 0;
    let updatedCount = 0;

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
          `Error checking payments for user ${userProfile.id}:`,
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
            `Error updating status for user ${userProfile.id}:`,
            updateError
          );
        } else {
          updatedCount++;
          console.log(
            `Updated user ${userProfile.id} from ${userProfile.status} to ${newStatus}`
          );

          // Si se suspende la cuenta, cerrar sesiones activas
          if (newStatus === "suspended") {
            try {
              await supabaseAdmin.auth.admin.signOut(userProfile.id, "global");
            } catch (signOutError) {
              console.error(
                `Error signing out user ${userProfile.id}:`,
                signOutError
              );
            }
          }
        }
      }
    }

    return NextResponse.json({
      success: true,
      processed: processedCount,
      updated: updatedCount,
      message: `Procesados ${processedCount} usuarios, ${updatedCount} actualizados`,
    });
  } catch (error) {
    console.error("Error processing user statuses:", error);
    return NextResponse.json(
      { error: "Error al procesar estados de usuarios" },
      { status: 500 }
    );
  }
}

// GET - Verificar y procesar un usuario específico cuando se registra un pago
export async function GET(request: NextRequest) {
  const user = await verifyAdminOrStaff(request);
  if (!user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const userId = searchParams.get("userId");

  if (!userId) {
    return NextResponse.json({ error: "userId requerido" }, { status: 400 });
  }

  try {
    // Obtener el usuario
    const { data: userProfile, error: userError } = await supabaseAdmin
      .from("profiles")
      .select("id, status")
      .eq("id", userId)
      .single();

    if (userError || !userProfile) {
      return NextResponse.json(
        { error: "Usuario no encontrado" },
        { status: 404 }
      );
    }

    // Verificar pagos del mes actual
    const { month, year } = getCurrentMonthYear();
    const { data: payments, error: paymentsError } = await supabaseAdmin
      .from("payments")
      .select("payment_date, concept")
      .eq("user_id", userId)
      .gte("payment_date", `${year}-${month.toString().padStart(2, "0")}-01`)
      .lt(
        "payment_date",
        `${year}-${(month + 1).toString().padStart(2, "0")}-01`
      )
      .order("payment_date", { ascending: false })
      .limit(1);

    if (paymentsError) throw paymentsError;

    const hasCurrentMonthPayment = payments && payments.length > 0;
    const newStatus = getNewUserStatus(
      userProfile.status,
      hasCurrentMonthPayment
    );

    // Actualizar estado si es necesario
    if (newStatus !== userProfile.status) {
      const { error: updateError } = await supabaseAdmin
        .from("profiles")
        .update({
          status: newStatus as "active" | "suspended" | "pending",
          updated_at: new Date().toISOString(),
        })
        .eq("id", userId);

      if (updateError) throw updateError;

      return NextResponse.json({
        success: true,
        statusChanged: true,
        oldStatus: userProfile.status,
        newStatus: newStatus,
        lastPayment: payments?.[0] || null,
      });
    }

    return NextResponse.json({
      success: true,
      statusChanged: false,
      currentStatus: userProfile.status,
      lastPayment: payments?.[0] || null,
    });
  } catch (error) {
    console.error("Error processing user status:", error);
    return NextResponse.json(
      { error: "Error al procesar estado del usuario" },
      { status: 500 }
    );
  }
}
