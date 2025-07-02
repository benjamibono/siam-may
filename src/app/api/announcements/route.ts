import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { requireRole } from "@/lib/auth";

// GET - Fetch all active announcements
export async function GET() {
  try {
    // Primero obtener los anuncios
    const { data: announcements, error: announcementsError } = await supabaseAdmin
      .from("announcements")
      .select(`
        id,
        title,
        content,
        user_id,
        expires_at,
        created_at,
        updated_at
      `)
      .or("expires_at.is.null,expires_at.gt.now()")
      .order("created_at", { ascending: false });

    if (announcementsError) throw announcementsError;

    // Luego obtener los perfiles de los usuarios que crearon los anuncios
    const userIds = [...new Set(announcements?.map(a => a.user_id) || [])];
    
    const { data: profiles, error: profilesError } = await supabaseAdmin
      .from("profiles")
      .select("id, name, first_surname, second_surname")
      .in("id", userIds);

    if (profilesError) throw profilesError;

    // Combinar los datos
    const announcementsWithProfiles = announcements?.map(announcement => ({
      ...announcement,
      profiles: profiles?.find(profile => profile.id === announcement.user_id) || null
    })) || [];

    return NextResponse.json(announcementsWithProfiles);
  } catch (error) {
    console.error("Error fetching announcements:", error);
    return NextResponse.json(
      { error: "Error al obtener los anuncios" },
      { status: 500 }
    );
  }
}

// POST - Create new announcement (admin/staff only)
export async function POST(request: NextRequest) {
  const authResult = await requireRole(request, ["admin", "staff"]);
  if ("error" in authResult) {
    return authResult.error;
  }

  const { user } = authResult;

  try {
    const body = await request.json();
    const { title, content, expires_at } = body;

    if (!title || !content) {
      return NextResponse.json(
        { error: "Título y contenido son requeridos" },
        { status: 400 }
      );
    }

    const { data: announcement, error } = await supabaseAdmin
      .from("announcements")
      .insert({
        title,
        content,
        user_id: user.id,
        expires_at: expires_at || null,
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(announcement, { status: 201 });
  } catch (error) {
    console.error("Error creating announcement:", error);
    return NextResponse.json(
      { error: "Error al crear el anuncio" },
      { status: 500 }
    );
  }
}

// PUT - Update announcement (admin/staff only)
export async function PUT(request: NextRequest) {
  const authResult = await requireRole(request, ["admin", "staff"]);
  if ("error" in authResult) {
    return authResult.error;
  }

  try {
    const body = await request.json();
    const { id, title, content, expires_at } = body;

    if (!id) {
      return NextResponse.json(
        { error: "ID del anuncio es requerido" },
        { status: 400 }
      );
    }

    const { data: announcement, error } = await supabaseAdmin
      .from("announcements")
      .update({
        title,
        content,
        expires_at: expires_at || null,
      })
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(announcement);
  } catch (error) {
    console.error("Error updating announcement:", error);
    return NextResponse.json(
      { error: "Error al actualizar el anuncio" },
      { status: 500 }
    );
  }
}

// DELETE - Delete announcement (admin/staff only)
export async function DELETE(request: NextRequest) {
  const authResult = await requireRole(request, ["admin", "staff"]);
  if ("error" in authResult) {
    return authResult.error;
  }

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "ID del anuncio es requerido" },
        { status: 400 }
      );
    }

    const { error } = await supabaseAdmin
      .from("announcements")
      .delete()
      .eq("id", id);

    if (error) throw error;

    return NextResponse.json({ message: "Anuncio eliminado correctamente" });
  } catch (error) {
    console.error("Error deleting announcement:", error);
    return NextResponse.json(
      { error: "Error al eliminar el anuncio" },
      { status: 500 }
    );
  }
} 