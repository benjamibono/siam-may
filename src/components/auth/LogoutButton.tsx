"use client";

import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

export function LogoutButton() {
  const router = useRouter();

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

      console.log("Attempting logout with session:", session.user?.email);

      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error("Logout error:", error);
        // Si el error es 403, podría ser un problema de configuración de URLs
        if (error.message.includes('403') || error.message.includes('Forbidden')) {
          toast.error("Error de configuración. Cerrando sesión localmente...");
          // Forzar logout local
          if (typeof window !== "undefined") {
            localStorage.clear();
            sessionStorage.clear();
          }
          router.push("/");
          return;
        }
        throw error;
      }

      // Limpiar el localStorage/sessionStorage si es necesario
      if (typeof window !== "undefined") {
        localStorage.removeItem("supabase.auth.token");
        sessionStorage.removeItem("supabase.auth.token");
      }

      toast.success("Sesión cerrada correctamente");

      // Opcional: forzar recarga de la página
      router.push("/");
    } catch (error) {
      console.error("Logout error:", error);
      toast.error("Error al cerrar sesión");
    }
  };

  return (
    <Button onClick={handleLogout} variant="outline" size="sm">
      Cerrar Sesión
    </Button>
  );
}
