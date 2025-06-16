import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

export async function GET(request: Request) {
  try {
    // Obtener el token de autenticación del header
    const authHeader = request.headers.get("authorization");

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      console.log("No auth header found");
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const token = authHeader.split(" ")[1];

    // Verificar el token con supabase admin
    const {
      data: { user },
      error: authError,
    } = await supabaseAdmin.auth.getUser(token);

    if (authError || !user) {
      console.log("Auth error:", authError);
      return NextResponse.json({ error: "Token inválido" }, { status: 401 });
    }

    // Verificar que el usuario sea admin o staff
    const { data: profile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profileError || !profile) {
      console.log("Profile error:", profileError);
      return NextResponse.json(
        { error: "Usuario no encontrado" },
        { status: 401 }
      );
    }

    if (profile.role !== "admin" && profile.role !== "staff") {
      console.log("User role:", profile.role);
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

    // Para cada clase, obtener los usuarios inscritos
    const classesWithEnrollments = await Promise.all(
      (classesData || []).map(async (cls) => {
        const { data: enrollments, error: enrollmentsError } =
          await supabaseAdmin
            .from("class_enrollments")
            .select("user_id")
            .eq("class_id", cls.id);

        if (enrollmentsError) throw enrollmentsError;

        const userIds = enrollments?.map((e) => e.user_id) || [];
        console.log(
          `Clase ${cls.name}: ${userIds.length} usuarios inscritos`,
          userIds
        );

        let users = [];
        if (userIds.length > 0) {
          const { data: usersData, error: usersError } = await supabaseAdmin
            .from("profiles")
            .select("name, first_surname, second_surname")
            .in("id", userIds);

          if (usersError) {
            console.error("Error obteniendo usuarios:", usersError);
            throw usersError;
          }
          users = usersData || [];
          console.log(`Usuarios obtenidos para ${cls.name}:`, users);
        }

        return {
          ...cls,
          enrolled_users: users,
          enrollment_count: enrollments?.length || 0,
        };
      })
    );

    return NextResponse.json(classesWithEnrollments);
  } catch (error) {
    console.error("Error fetching classes:", error);
    return NextResponse.json(
      { error: "Error al obtener las clases" },
      { status: 500 }
    );
  }
}
