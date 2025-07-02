import { useEffect, useRef, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

interface SessionValidationResponse {
  valid: boolean;
  reason?: string;
  shouldSignOut?: boolean;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function useSessionValidator(user: any, intervalMs: number = 60000) { // Check every minute by default
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const isValidatingRef = useRef(false);

  const validateSession = useCallback(async () => {
    if (!user || isValidatingRef.current) return;
    
    isValidatingRef.current = true;
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.access_token) {
        return;
      }

      const response = await fetch("/api/auth/validate-session", {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${session.access_token}`,
        },
      });

      const result: SessionValidationResponse = await response.json();

      if (!result.valid && result.shouldSignOut) {
        let message = "Tu sesión ha expirado.";
        
        if (result.reason === "Profile not found") {
          message = "Tu cuenta ha sido eliminada. Serás desconectado automáticamente.";
        } else if (result.reason === "Account suspended") {
          message = "Tu cuenta ha sido suspendida. Contacta con el administrador.";
        }

        toast.error(message);
        await supabase.auth.signOut();
      }
    } catch (error) {
      console.error("Error validating session:", error);
      // Don't sign out on network errors, only on explicit validation failures
    } finally {
      isValidatingRef.current = false;
    }
  }, [user]);

  useEffect(() => {
    if (!user) {
      // Clear interval if user is not logged in
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    // Start periodic validation
    intervalRef.current = setInterval(validateSession, intervalMs);

    // Also validate when user returns to the tab/window
    const handleFocus = () => {
      validateSession();
    };

    const handleVisibilityChange = () => {
      if (!document.hidden) {
        validateSession();
      }
    };

    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Cleanup on unmount
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [user, intervalMs, validateSession]);

  // Also validate immediately when user changes
  useEffect(() => {
    if (user) {
      validateSession();
    }
  }, [user, validateSession]);
} 