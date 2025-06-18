import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Cliente con service role key para operaciones admin
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

// Cliente normal para verificar el usuario actual
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

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

// POST - Suspender/Activar cuenta de usuario
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await verifyAdminOrStaff(request);
  if (!user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  try {
    const { id } = await params;
    const { status } = await request.json();

    // Actualizar el estado en la tabla profiles
    const { error: profileError } = await supabaseAdmin
      .from("profiles")
      .update({
        status: status,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);

    if (profileError) throw profileError;

    // Si se está suspendiendo la cuenta, cerrar todas las sesiones activas
    if (status === "suspended") {
      try {
        // Cerrar todas las sesiones del usuario
        await supabaseAdmin.auth.admin.signOut(id, "global");
      } catch (signOutError) {
        console.error("Error signing out user:", signOutError);
        // No fallar la operación por esto, el usuario ya está suspendido
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error suspending/activating user:", error);
    return NextResponse.json(
      { error: "Error al cambiar estado de la cuenta" },
      { status: 500 }
    );
  }
}
