import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

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

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");
    if (!authHeader) {
      return NextResponse.json({ valid: false, reason: "No authorization header" }, { status: 401 });
    }

    const token = authHeader.replace("Bearer ", "");

    // Verificar el token con Supabase
    const { data: { user }, error } = await supabase.auth.getUser(token);
    
    if (error || !user) {
      return NextResponse.json({ valid: false, reason: "Invalid token" }, { status: 401 });
    }

    // Verificar que el perfil del usuario aún existe
    const { data: profile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("id, status")
      .eq("id", user.id)
      .single();

    if (profileError || !profile) {
      // El perfil no existe, la cuenta fue eliminada
      return NextResponse.json({ 
        valid: false, 
        reason: "Profile not found",
        shouldSignOut: true 
      }, { status: 404 });
    }

    // Verificar si la cuenta está suspendida
    if (profile.status === "suspended") {
      return NextResponse.json({ 
        valid: false, 
        reason: "Account suspended",
        shouldSignOut: true 
      }, { status: 403 });
    }

    return NextResponse.json({ valid: true, user: { id: user.id }, profile });
  } catch (error) {
    console.error("Error validating session:", error);
    return NextResponse.json({ 
      valid: false, 
      reason: "Server error",
      shouldSignOut: true 
    }, { status: 500 });
  }
} 