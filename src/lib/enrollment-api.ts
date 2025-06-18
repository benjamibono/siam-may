import { supabase } from "./supabase";

export interface EnrollmentApiResponse {
  success: boolean;
  message?: string;
  error?: string;
  rateLimitInfo?: {
    limit: number;
    remaining: number;
    reset: number;
  };
}

export async function handleEnrollment(
  action: "enroll" | "unenroll",
  classId: string
): Promise<EnrollmentApiResponse> {
  try {
    // Obtener el token de sesión
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.access_token) {
      throw new Error("No hay sesión activa");
    }

    const response = await fetch("/api/classes/enroll", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({
        classId,
        action,
      }),
    });

    const data = await response.json();

    if (response.status === 429) {
      // Rate limit excedido
      const resetTime = data.rateLimitInfo?.reset || Date.now() + 60000;
      const resetDate = new Date(resetTime);
      const waitTime = Math.ceil((resetTime - Date.now()) / 1000);

      return {
        success: false,
        error: `Has excedido el límite de ${
          action === "enroll" ? "inscripciones" : "desinscripciones"
        }. Inténtalo de nuevo en ${waitTime} segundos (${resetDate.toLocaleTimeString()}).`,
        rateLimitInfo: data.rateLimitInfo,
      };
    }

    if (!response.ok) {
      throw new Error(data.error || "Error en la operación");
    }

    return {
      success: true,
      message: data.message,
    };
  } catch (error) {
    console.error("Error en inscripción/desinscripción:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Error desconocido",
    };
  }
}

export async function handleLogin(
  email: string,
  password: string
): Promise<EnrollmentApiResponse> {
  try {
    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email,
        password,
      }),
    });

    const data = await response.json();

    if (response.status === 429) {
      // Rate limit excedido
      const resetTime = data.rateLimitInfo?.reset || Date.now() + 900000; // 15 minutos por defecto
      const resetDate = new Date(resetTime);
      const waitTime = Math.ceil((resetTime - Date.now()) / 1000);

      return {
        success: false,
        error: `Has excedido el límite de intentos de inicio de sesión. Inténtalo de nuevo en ${Math.ceil(
          waitTime / 60
        )} minutos (${resetDate.toLocaleTimeString()}).`,
        rateLimitInfo: data.rateLimitInfo,
      };
    }

    if (!response.ok) {
      throw new Error(data.error || "Error en el inicio de sesión");
    }

    return {
      success: true,
      message: "Inicio de sesión exitoso",
    };
  } catch (error) {
    console.error("Error en login:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Error desconocido",
    };
  }
}

export function formatRateLimitError(
  error: string,
  rateLimitInfo?: unknown
): string {
  if (!rateLimitInfo) return error;

  // Type assertion para acceder a las propiedades
  const limitInfo = rateLimitInfo as { reset: number };
  const resetTime = new Date(limitInfo.reset);
  const waitTime = Math.ceil((limitInfo.reset - Date.now()) / 1000);

  if (waitTime > 0) {
    const minutes = Math.ceil(waitTime / 60);
    const seconds = waitTime % 60;

    if (minutes > 0) {
      return `${error} Podrás intentarlo de nuevo en ${minutes} minuto${
        minutes > 1 ? "s" : ""
      } (${resetTime.toLocaleTimeString()}).`;
    } else {
      return `${error} Podrás intentarlo de nuevo en ${seconds} segundo${
        seconds > 1 ? "s" : ""
      }.`;
    }
  }

  return error;
}
