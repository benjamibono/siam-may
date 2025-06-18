import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { withRateLimit, getUserIdentifier } from "@/lib/rate-limit";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

async function getAuthenticatedUser(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (!authHeader) return null;

  const token = authHeader.replace("Bearer ", "");

  try {
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser(token);
    if (error || !user) return null;
    return user;
  } catch {
    return null;
  }
}

async function getHandler(request: NextRequest): Promise<NextResponse> {
  const user = await getAuthenticatedUser(request);
  if (!user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

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
