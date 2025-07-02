import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { requireRole } from "@/lib/auth";

// Utilizamos requireRole para asegurar que solo admins puedan acceder

// GET - Obtener todos los usuarios
export async function GET(request: NextRequest) {
  const authResult = await requireRole(request, ["admin"]);
  if ("error" in authResult) {
    return authResult.error;
  }

  try {
    const { data, error } = await supabaseAdmin
      .from("profiles")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw error;

    return NextResponse.json({ data });
  } catch (error) {
    console.error("Error fetching users:", error);
    return NextResponse.json(
      { error: "Error al obtener usuarios" },
      { status: 500 }
    );
  }
}

// PUT - Actualizar usuario
export async function PUT(request: NextRequest) {
  const authResult = await requireRole(request, ["admin"]);
  if ("error" in authResult) {
    return authResult.error;
  }

  try {
    const { id, ...updateData } = await request.json();

    const { data, error } = await supabaseAdmin
      .from("profiles")
      .update({
        ...updateData,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ data });
  } catch (error) {
    console.error("Error updating user:", error);
    return NextResponse.json(
      { error: "Error al actualizar usuario" },
      { status: 500 }
    );
  }
}

// DELETE - Eliminar usuario
export async function DELETE(request: NextRequest) {
  const authResult = await requireRole(request, ["admin"]);
  if ("error" in authResult) {
    return authResult.error;
  }

  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("id");

    if (!userId) {
      return NextResponse.json(
        { error: "ID de usuario requerido" },
        { status: 400 }
      );
    }

    const { error } = await supabaseAdmin
      .from("profiles")
      .delete()
      .eq("id", userId);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting user:", error);
    return NextResponse.json(
      { error: "Error al eliminar usuario" },
      { status: 500 }
    );
  }
}
