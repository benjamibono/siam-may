import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { withRateLimit, getUserIdentifier } from "@/lib/rate-limit";

async function getHandler(request: NextRequest): Promise<NextResponse> {
  try {
    // Obtener el token de autenticación del header
    const authHeader = request.headers.get("authorization");

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const token = authHeader.split(" ")[1];

    // Verificar el token con supabase admin
    const {
      data: { user },
      error: authError,
    } = await supabaseAdmin.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json({ error: "Token inválido" }, { status: 401 });
    }

    // Verificar que el usuario sea admin o staff
    const { data: profile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json(
        { error: "Usuario no encontrado" },
        { status: 401 }
      );
    }

    if (profile.role !== "admin" && profile.role !== "staff") {
      return NextResponse.json(
        { error: "Sin permisos suficientes" },
        { status: 403 }
      );
    }

    // Obtener las clases
    const { data: classesData, error: classesError } = await supabaseAdmin
      .from("classes")
      .select("*")
      .order("name");

    if (classesError) throw classesError;

    // Para cada clase, obtener los usuarios inscritos de forma optimizada
    const classesWithEnrollments = await Promise.all(
      (classesData || []).map(async (cls) => {
        const { data: enrollments, error: enrollmentsError } =
          await supabaseAdmin
            .from("class_enrollments")
            .select("user_id")
            .eq("class_id", cls.id);

        if (enrollmentsError) throw enrollmentsError;

        const userIds = enrollments?.map((e) => e.user_id) || [];

        let users = [];
        if (userIds.length > 0) {
          const { data: usersData, error: usersError } = await supabaseAdmin
            .from("profiles")
            .select("name, first_surname, second_surname")
            .in("id", userIds);

          if (usersError) {
            throw usersError;
          }
          users = usersData || [];
        }

        return {
          ...cls,
          enrolled_users: users,
          enrollment_count: enrollments?.length || 0,
        };
      })
    );

    return NextResponse.json(classesWithEnrollments);
  } catch {
    return NextResponse.json(
      { error: "Error al obtener las clases" },
      { status: 500 }
    );
  }
}

export const GET = withRateLimit(
  "GENERAL_REFRESH",
  getUserIdentifier
)(getHandler);
