import { NextRequest, NextResponse } from "next/server";
import { withRateLimit, getUserIdentifier } from "@/lib/rate-limit";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { requireRole } from "@/lib/auth";

async function getHandler(request: NextRequest): Promise<NextResponse> {
  const authResult = await requireRole(request, ["user", "admin", "staff"]);
  if ("error" in authResult) {
    return authResult.error;
  }
  const { user } = authResult;

  try {
    // Obtener perfil del usuario
    const { data: profile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();

    if (profileError) throw profileError;

    // Obtener último pago
    const { data: lastPayment } = await supabaseAdmin
      .from("payments")
      .select("concept, payment_date")
      .eq("user_id", user.id)
      .order("payment_date", { ascending: false })
      .limit(1)
      .single();

    // Obtener clases inscritas
    const { data: enrolledClasses } = await supabaseAdmin
      .from("class_enrollments")
      .select(
        `
        class_id,
        classes (
          id,
          name,
          description,
          schedule,
          capacity
        )
      `
      )
      .eq("user_id", user.id);

    return NextResponse.json({
      profile,
      lastPayment,
      enrolledClasses: enrolledClasses?.map((e) => e.classes) || [],
    });
  } catch (error) {
    console.error("Error fetching user profile:", error);
    return NextResponse.json(
      { error: "Error al obtener perfil del usuario" },
      { status: 500 }
    );
  }
}

export const GET = withRateLimit(
  "GENERAL_REFRESH",
  getUserIdentifier
)(getHandler);
