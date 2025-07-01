import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { supabase } from "@/lib/supabase";

async function verifyAdminOrStaff(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (!authHeader) return null;

  const token = authHeader.replace("Bearer ", "");

  try {
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser(token);
    if (error || !user) return null;

    // Verificar que el usuario es admin o staff
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profile?.role !== "admin" && profile?.role !== "staff") return null;

    return user;
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
  } catch (_error) {
    return null;
  }
}

export async function GET(request: NextRequest) {
  const user = await verifyAdminOrStaff(request);
  if (!user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  try {
    // Obtener todos los usuarios excepto administradores
    const { data, error } = await supabaseAdmin
      .from("profiles")
      .select("id, name, first_surname, second_surname, email")
      .in("role", ["user"])
      .order("name");

    if (error) throw error;

    const userOptions = data.map((u) => ({
      id: u.id,
      label:
        u.name && u.first_surname
          ? `${u.name} ${u.first_surname} ${u.second_surname || ""}`.trim()
          : u.email,
      email: u.email,
    }));

    return NextResponse.json({ users: userOptions });
  } catch (error) {
    console.error("Error fetching users for payments:", error);
    return NextResponse.json(
      { error: "Error al obtener usuarios" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const user = await verifyAdminOrStaff(request);
  if (!user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  try {
    const paymentData = await request.json();

    // Crear el pago usando supabaseAdmin
    const { data: payment, error } = await supabaseAdmin
      .from("payments")
      .insert(paymentData)
      .select()
      .single();

    if (error) {
      console.error("Error creating payment:", error);
      return NextResponse.json(
        { error: "Error al crear el pago" },
        { status: 500 }
      );
    }

    // Procesar el estado del usuario después de crear el pago
    const response = await fetch(
      `${request.nextUrl.origin}/api/payments/process-status?userId=${paymentData.user_id}`,
      {
        headers: {
          Authorization: `Bearer ${request.headers.get("authorization")}`,
        },
      }
    );

    const result = await response.json();

    return NextResponse.json({
      success: true,
      payment,
      statusUpdate: result,
    });
  } catch (error) {
    console.error("Error in payment creation:", error);
    return NextResponse.json(
      { error: "Error al procesar el pago" },
      { status: 500 }
    );
  }
}
