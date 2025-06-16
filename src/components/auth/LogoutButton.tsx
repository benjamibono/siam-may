"use client";

import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export function LogoutButton() {
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

  return (
    <Button onClick={handleLogout} variant="outline" size="sm">
      Cerrar Sesión
    </Button>
  );
}
