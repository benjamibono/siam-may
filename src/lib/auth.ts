import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

/**
 * Intenta extraer y verificar el token JWT enviado en el header `Authorization: Bearer <token>`
 * y comprueba que el usuario asociado posea uno de los roles requeridos.
 *
 * Devuelve un objeto con la entidad `user` (de Supabase) y su `role` si la comprobación es correcta.
 * Si hay algún problema (token ausente, inválido o rol insuficiente) se devuelve una `NextResponse`
 * lista para ser retornada por la ruta llamante.
 */
export async function requireRole(
  request: Request,
  roles: ("admin" | "staff" | "user")[] = ["admin"]
): Promise<
  | { user: NonNullable<Awaited<ReturnType<typeof supabaseAdmin.auth.getUser>>["data"]>["user"]; role: string }
  | { error: NextResponse }
> {
  // 1. Leer cabecera Authorization
  const authHeader = request.headers.get("authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return {
      error: NextResponse.json({ error: "No autorizado" }, { status: 401 }),
    };
  }

  const token = authHeader.split(" ")[1];

  // 2. Validar token con Supabase Admin
  const {
    data: { user },
    error: authError,
  } = await supabaseAdmin.auth.getUser(token);

  if (authError || !user) {
    return {
      error: NextResponse.json({ error: "Token inválido" }, { status: 401 }),
    };
  }

  // 3. Obtener rol del usuario
  const { data: profile, error: profileError } = await supabaseAdmin
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profileError || !profile) {
    return {
      error: NextResponse.json({ error: "Usuario no encontrado" }, { status: 401 }),
    };
  }

  type AllowedRole = (typeof roles)[number];
  if (!roles.includes(profile.role as AllowedRole)) {
    return {
      error: NextResponse.json(
        { error: "Sin permisos suficientes" },
        { status: 403 }
      ),
    };
  }

  return { user, role: profile.role };
} 