import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import type { Tables } from "@/lib/supabase";
import type { User } from "@supabase/supabase-js";
import { toast } from "sonner";

export function useProfile() {
  const [profile, setProfile] = useState<Tables<"profiles"> | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSuspended, setIsSuspended] = useState(false);

  useEffect(() => {
    // Get initial session
    supabase.auth
      .getSession()
      .then(({ data: { session }, error }) => {
        if (error) {
          setIsLoading(false);
          return;
        }

        setUser(session?.user ?? null);
        if (session?.user) {
          fetchProfile(session.user.id);
        } else {
          setIsLoading(false);
        }
      })
      .catch(() => {
        setIsLoading(false);
      });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id);
      } else {
        setProfile(null);
        setIsSuspended(false);
        setIsLoading(false);
      }

      // Handle sign out specifically
      if (event === "SIGNED_OUT") {
        setProfile(null);
        setUser(null);
        setIsSuspended(false);
        setIsLoading(false);
        // Clear pending toast flag on sign out
        if (typeof window !== "undefined") {
          localStorage.removeItem("pendingToastShown");
        }
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .single();

      if (error) {
        // Si el perfil no existe (cuenta eliminada), cerrar sesión automáticamente
        if (error.code === 'PGRST116' || error.message?.includes('No rows found') || error.details?.includes('0 rows')) {
          toast.error("Tu cuenta ha sido eliminada. Serás desconectado automáticamente.");
          await supabase.auth.signOut();
          setProfile(null);
          setUser(null);
          setIsLoading(false);
          return;
        }
        throw error;
      }

      // Verificar si la cuenta está suspendida
      if (data.status === "suspended") {
        setIsSuspended(true);
        toast.error("Cuenta suspendida. Contacte con el administrador.");
        // Cerrar sesión automáticamente
        await supabase.auth.signOut();
        setProfile(null);
        setUser(null);
        setIsLoading(false);
        return;
      }

      // Mostrar mensaje informativo para cuentas pendientes SOLO UNA VEZ por sesión
      if (data.status === "pending") {
        const toastKey = `pendingToastShown_${userId}`;
        const hasShownToast = typeof window !== "undefined" && localStorage.getItem(toastKey);
        
        if (!hasShownToast) {
          toast.info(
            "Cuenta pendiente de pago. Revisa las condiciones de inscripción.",
            {
              duration: 5000,
            }
          );
          if (typeof window !== "undefined") {
            localStorage.setItem(toastKey, "true");
          }
        }
      }

      setProfile(data);
      setIsSuspended(false);
    } catch (error) {
      // Si hay cualquier otro error al obtener el perfil, también cerrar sesión por seguridad
      console.error("Error fetching profile:", error);
      toast.error("Error al cargar tu perfil. Serás desconectado por seguridad.");
      await supabase.auth.signOut();
      setProfile(null);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  const isAdmin = profile?.role === "admin";
  const isStaff = profile?.role === "staff";

  return {
    profile,
    user,
    isLoading,
    isSuspended,
    isAdmin,
    isStaff,
  };
}
