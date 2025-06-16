import { createClient } from "@supabase/supabase-js";
import type { Database } from "./supabase";

// Cliente administrativo que bypassa RLS
// ⚠️ SOLO usar en el servidor/backend, NUNCA en el frontend
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!; // Esta key bypassa RLS

export const supabaseAdmin = createClient<Database>(
  supabaseUrl,
  supabaseServiceKey,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

// Ejemplo de uso para operaciones administrativas
export async function getAllProfilesAsAdmin() {
  // Esta función bypassa RLS y puede ver todos los perfiles
  const { data, error } = await supabaseAdmin.from("profiles").select("*");

  return { data, error };
}

export async function updateUserRoleAsAdmin(
  userId: string,
  role: "admin" | "staff" | "user"
) {
  // Esta función bypassa RLS y puede actualizar cualquier perfil
  const { data, error } = await supabaseAdmin
    .from("profiles")
    .update({ role })
    .eq("id", userId);

  return { data, error };
}
