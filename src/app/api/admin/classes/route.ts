import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { withRateLimit, getUserIdentifier } from "@/lib/rate-limit";
import { requireRole } from "@/lib/auth";

async function getHandler(request: NextRequest): Promise<NextResponse> {
  try {
    // ✅ Verificación de token y rol mediante helper reutilizable
    const authResult = await requireRole(request, ["admin", "staff"]);
    if ("error" in authResult) {
      return authResult.error;
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
