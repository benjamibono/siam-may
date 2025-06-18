import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { withRateLimit, getUserIdentifier } from "@/lib/rate-limit";

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

// POST - Cambiar email de usuario
async function postHandler(request: NextRequest): Promise<NextResponse> {
  const user = await verifyAdminOrStaff(request);
  if (!user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  try {
    // Extraer ID del URL
    const url = new URL(request.url);
    const pathSegments = url.pathname.split("/");
    const id = pathSegments[pathSegments.length - 2]; // El ID está antes de 'change-email'
    const { newEmail } = await request.json();

    // Usar el cliente admin para actualizar el email directamente
    const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(
      id,
      { email: newEmail }
    );

    if (authError) throw authError;

    // Actualizar también en la tabla profiles
    const { error: profileError } = await supabaseAdmin
      .from("profiles")
      .update({
        email: newEmail,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);

    if (profileError) throw profileError;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error changing email:", error);
    return NextResponse.json(
      { error: "Error al cambiar email" },
      { status: 500 }
    );
  }
}

export const POST = withRateLimit(
  "EMAIL_CHANGE",
  getUserIdentifier
)(postHandler);
