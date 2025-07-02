import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

export async function GET() {
  try {
    // Delete expired announcements
    const { data, error } = await supabaseAdmin
      .from("announcements")
      .delete()
      .lt("expires_at", new Date().toISOString())
      .select("id");

    if (error) throw error;

    const deletedCount = data?.length || 0;

    return NextResponse.json({
      success: true,
      message: `Cleaned up ${deletedCount} expired announcements`,
      deletedCount,
    });
  } catch (error) {
    console.error("Error cleaning up announcements:", error);
    return NextResponse.json(
      { error: "Error cleaning up announcements" },
      { status: 500 }
    );
  }
} 