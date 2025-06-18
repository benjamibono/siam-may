import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { withRateLimit } from "@/lib/rate-limit";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

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

async function loginHandler(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email y contraseña son requeridos" },
        { status: 400 }
      );
    }

    // Intentar autenticar al usuario
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }

    if (!data.user) {
      return NextResponse.json(
        { error: "Error de autenticación" },
        { status: 401 }
      );
    }

    // Verificar si la cuenta está suspendida
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("status")
      .eq("id", data.user.id)
      .single();

    if (profile?.status === "suspended") {
      // Cerrar la sesión si está suspendida
      await supabase.auth.signOut();
      return NextResponse.json(
        { error: "Cuenta suspendida. Contacte con el administrador." },
        { status: 403 }
      );
    }

    return NextResponse.json({
      success: true,
      user: data.user,
      session: data.session,
    });
  } catch (error) {
    console.error("Error en login:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}

// Aplicar rate limiting específico para login usando solo IP
export const POST = withRateLimit("LOGIN")(loginHandler);
