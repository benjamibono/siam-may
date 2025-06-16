"use client";

import { supabase } from "@/lib/supabase";
import { useProfile } from "@/hooks/useProfile";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export function UserInfo() {
  const { user, profile, isLoading } = useProfile();

  const handleLogout = async () => {
    try {
      // Verificar si hay una sesión activa antes de cerrarla
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        toast.error("No hay una sesión activa para cerrar");
        return;
      }

      const { error } = await supabase.auth.signOut();
      if (error) throw error;

      // Limpiar el localStorage/sessionStorage si es necesario
      if (typeof window !== "undefined") {
        localStorage.removeItem("supabase.auth.token");
        sessionStorage.removeItem("supabase.auth.token");
      }

      toast.success("Sesión cerrada correctamente");

      // Opcional: forzar recarga de la página
      window.location.reload();
    } catch (error: unknown) {
      console.error("Error during logout:", error);
      if (error instanceof Error) {
        toast.error(`Error al cerrar sesión: ${error.message}`);
      } else {
        toast.error("Error desconocido al cerrar sesión");
      }
    }
  };

  if (isLoading) return null;
  if (!user) return null;

  return (
    <div className="bg-white border-b shadow-sm p-4">
      <div className="max-w-7xl mx-auto flex justify-between items-center">
        <div>
          <p className="text-sm text-gray-600">Sesión iniciada como:</p>
          <p className="font-medium">{profile?.name || user.email}</p>
          {profile?.role && (
            <span className="inline-block px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full">
              {profile.role === "admin"
                ? "Administrador"
                : profile.role === "staff"
                ? "Personal"
                : "Usuario"}
            </span>
          )}
        </div>
        <Button onClick={handleLogout} variant="outline" size="sm">
          Cerrar Sesión
        </Button>
      </div>
    </div>
  );
}
