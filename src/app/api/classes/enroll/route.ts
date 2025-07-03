import { NextRequest, NextResponse } from "next/server";
// import { supabase } from "@/lib/supabase"; // Removed unused import
import { createClient } from "@supabase/supabase-js";
import { withRateLimit, getUserIdentifier } from "@/lib/rate-limit";
import {
  canEnrollInClasses,
  canEnrollInClassType,
  getEnrollmentStatusMessage,
  getClassRestrictionMessage,
  isValidMedicalInsurance,
} from "@/lib/payment-logic";

// Cliente admin para operaciones privilegiadas
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

// Cliente normal para autenticación
const supabaseClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

async function getAuthenticatedUser(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (!authHeader) return null;

  const token = authHeader.replace("Bearer ", "");

  try {
    const {
      data: { user },
      error,
    } = await supabaseClient.auth.getUser(token);
    if (error || !user) return null;
    return user;
  } catch {
    return null;
  }
}

async function enrollmentHandler(request: NextRequest): Promise<NextResponse> {
  const user = await getAuthenticatedUser(request);
  if (!user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { classId, action } = body; // action: 'enroll' | 'unenroll'

    if (!classId || !action) {
      return NextResponse.json(
        { error: "Faltan parámetros requeridos" },
        { status: 400 }
      );
    }

    // Obtener perfil del usuario
    const { data: profile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json(
        { error: "Error al obtener perfil del usuario" },
        { status: 500 }
      );
    }

    // Obtener información de la clase
    const { data: classInfo, error: classError } = await supabaseAdmin
      .from("classes")
      .select("*")
      .eq("id", classId)
      .single();

    if (classError || !classInfo) {
      return NextResponse.json(
        { error: "Clase no encontrada" },
        { status: 404 }
      );
    }

    if (action === "unenroll") {
      // Desinscribirse (siempre permitido)
      const { error } = await supabaseAdmin
        .from("class_enrollments")
        .delete()
        .eq("user_id", user.id)
        .eq("class_id", classId);

      if (error) throw error;

      return NextResponse.json({
        success: true,
        message: "Te has desinscrito de la clase exitosamente",
      });
    } else if (action === "enroll") {
      // Verificar el último pago de seguro médico
      const { data: lastMedicalInsurance } = await supabaseAdmin
        .from("payments")
        .select("payment_date")
        .eq("user_id", user.id)
        .eq("concept", "Seguro Médico")
        .order("payment_date", { ascending: false })
        .limit(1)
        .single();

      const hasMedicalInsurance = isValidMedicalInsurance(lastMedicalInsurance?.payment_date || null);

      // Verificar si puede inscribirse según el estado y seguro médico
      if (!canEnrollInClasses(profile.status, hasMedicalInsurance)) {
        const message = getEnrollmentStatusMessage(profile.status, hasMedicalInsurance);
        return NextResponse.json({ error: message }, { status: 403 });
      }

      // Obtener último pago de cuota mensual del usuario (excluyendo seguro médico y matrícula)
      const { data: lastPayment } = await supabaseAdmin
        .from("payments")
        .select("concept, payment_date")
        .eq("user_id", user.id)
        .not("concept", "in", '("Seguro Médico","Matrícula")')
        .order("payment_date", { ascending: false })
        .limit(1)
        .single();

      // Verificar si puede inscribirse según el tipo de pago
      if (!canEnrollInClassType(classInfo.name, lastPayment?.concept || null)) {
        const message = getClassRestrictionMessage(
          classInfo.name,
          lastPayment?.concept || null
        );
        return NextResponse.json({ error: message }, { status: 403 });
      }

      // Verificar capacidad de la clase
      const { count: enrollmentCount } = await supabaseAdmin
        .from("class_enrollments")
        .select("*", { count: "exact", head: true })
        .eq("class_id", classId);

      if ((enrollmentCount || 0) >= classInfo.capacity) {
        return NextResponse.json(
          { error: "La clase está llena" },
          { status: 409 }
        );
      }

      // Verificar si ya está inscrito
      const { data: existingEnrollment } = await supabaseAdmin
        .from("class_enrollments")
        .select("id")
        .eq("user_id", user.id)
        .eq("class_id", classId)
        .single();

      if (existingEnrollment) {
        return NextResponse.json(
          { error: "Ya estás inscrito en esta clase" },
          { status: 409 }
        );
      }

      // Inscribirse
      const { error } = await supabaseAdmin.from("class_enrollments").insert({
        user_id: user.id,
        class_id: classId,
      });

      if (error) throw error;

      return NextResponse.json({
        success: true,
        message: "Te has inscrito a la clase exitosamente",
      });
    } else {
      return NextResponse.json({ error: "Acción no válida" }, { status: 400 });
    }
  } catch (error) {
    console.error("Error en inscripción/desinscripción:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}

// Aplicar rate limiting al endpoint
export const POST = withRateLimit(
  "ENROLLMENT",
  getUserIdentifier
)(enrollmentHandler);
