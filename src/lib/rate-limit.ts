import NodeCache from "node-cache";
import { NextRequest, NextResponse } from "next/server";

// Cache para almacenar los contadores de rate limiting
const rateLimitCache = new NodeCache();

// Configuraciones de rate limiting por endpoint
export const RATE_LIMITS = {
  // Inscripción/desinscripción de clases
  ENROLLMENT: {
    maxRequests: 20, // 20 acciones por ventana de tiempo
    windowMs: 60 * 1000, // 1 minuto
  },
  // Inicio de sesión
  LOGIN: {
    maxRequests: 15, // 15 intentos por ventana de tiempo
    windowMs: 5 * 60 * 1000, // 5 minutos
  },
  // Cambio de datos personales
  PROFILE_UPDATE: {
    maxRequests: 10, // 10 cambios por ventana de tiempo
    windowMs: 5 * 60 * 1000, // 5 minutos
  },
  // Refresco general de datos
  GENERAL_REFRESH: {
    maxRequests: 60, // 60 refrescos por ventana de tiempo
    windowMs: 60 * 1000, // 1 minuto
  },
  // Cambio de contraseña
  PASSWORD_CHANGE: {
    maxRequests: 8, // 8 intentos por ventana de tiempo
    windowMs: 10 * 60 * 1000, // 10 minutos
  },
  // Cambio de email
  EMAIL_CHANGE: {
    maxRequests: 5, // 5 intentos por ventana de tiempo
    windowMs: 15 * 60 * 1000, // 15 minutos
  },
} as const;

export type RateLimitType = keyof typeof RATE_LIMITS;

interface RateLimitData {
  count: number;
  resetTime: number;
}

/**
 * Función principal de rate limiting
 */
export function rateLimit(
  identifier: string,
  limitType: RateLimitType
): {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number;
  error?: string;
} {
  const config = RATE_LIMITS[limitType];
  const key = `${limitType}:${identifier}`;
  const now = Date.now();

  // Obtener datos actuales del cache
  const currentData = rateLimitCache.get<RateLimitData>(key);

  if (!currentData) {
    // Primera petición, crear entrada
    const newData: RateLimitData = {
      count: 1,
      resetTime: now + config.windowMs,
    };

    // Establecer TTL para que expire automáticamente
    rateLimitCache.set(key, newData, Math.ceil(config.windowMs / 1000));

    return {
      success: true,
      limit: config.maxRequests,
      remaining: config.maxRequests - 1,
      reset: newData.resetTime,
    };
  }

  // Verificar si la ventana de tiempo ha expirado
  if (now >= currentData.resetTime) {
    // Ventana expirada, resetear contador
    const newData: RateLimitData = {
      count: 1,
      resetTime: now + config.windowMs,
    };

    rateLimitCache.set(key, newData, Math.ceil(config.windowMs / 1000));

    return {
      success: true,
      limit: config.maxRequests,
      remaining: config.maxRequests - 1,
      reset: newData.resetTime,
    };
  }

  // Verificar si se ha alcanzado el límite
  if (currentData.count >= config.maxRequests) {
    return {
      success: false,
      limit: config.maxRequests,
      remaining: 0,
      reset: currentData.resetTime,
      error: `Límite de ${
        config.maxRequests
      } peticiones alcanzado. Inténtalo de nuevo en ${Math.ceil(
        (currentData.resetTime - now) / 1000
      )} segundos.`,
    };
  }

  // Incrementar contador
  currentData.count++;
  rateLimitCache.set(
    key,
    currentData,
    Math.ceil((currentData.resetTime - now) / 1000)
  );

  return {
    success: true,
    limit: config.maxRequests,
    remaining: config.maxRequests - currentData.count,
    reset: currentData.resetTime,
  };
}

/**
 * Función para verificar si un usuario es administrador o staff
 */
async function checkIfUserIsAdminOrStaff(request: NextRequest): Promise<boolean> {
  try {
    const authHeader = request.headers.get("authorization");
    if (!authHeader) return false;

    const token = authHeader.replace("Bearer ", "");

    // Crear cliente temporal para verificar
    const { createClient } = await import("@supabase/supabase-js");
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    const {
      data: { user },
      error,
    } = await supabase.auth.getUser(token);
    if (error || !user) return false;

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    return profile?.role === "admin" || profile?.role === "staff";
  } catch {
    return false;
  }
}

/**
 * Middleware para aplicar rate limiting en rutas de API
 */
export function withRateLimit(
  limitType: RateLimitType,
  getIdentifier?: (request: NextRequest) => string | Promise<string>
) {
  return function rateLimitWrapper(
    handler: (request: NextRequest) => Promise<NextResponse> | NextResponse
  ) {
    return async function rateLimitMiddleware(
      request: NextRequest
    ): Promise<NextResponse> {
      try {
        // Verificar si el usuario es administrador o staff
        const isAdminOrStaff = await checkIfUserIsAdminOrStaff(request);
        if (isAdminOrStaff) {
          // Los administradores y staff no tienen rate limiting
          return await handler(request);
        }

        // Obtener identificador único (IP por defecto, o personalizado)
        let identifier: string;

        if (getIdentifier) {
          identifier = await getIdentifier(request);
        } else {
          // Usar IP como identificador por defecto
          identifier =
            request.headers.get("x-forwarded-for") ||
            request.headers.get("x-real-ip") ||
            "unknown";
        }

        // Aplicar rate limiting
        const result = rateLimit(identifier, limitType);

        if (!result.success) {
          return NextResponse.json(
            {
              error: result.error,
              rateLimitInfo: {
                limit: result.limit,
                remaining: result.remaining,
                reset: result.reset,
              },
            },
            {
              status: 429,
              headers: {
                "X-RateLimit-Limit": result.limit.toString(),
                "X-RateLimit-Remaining": result.remaining.toString(),
                "X-RateLimit-Reset": result.reset.toString(),
              },
            }
          );
        }

        // Continuar con el handler original
        const response = await handler(request);

        // Añadir headers de rate limit info
        response.headers.set("X-RateLimit-Limit", result.limit.toString());
        response.headers.set(
          "X-RateLimit-Remaining",
          result.remaining.toString()
        );
        response.headers.set("X-RateLimit-Reset", result.reset.toString());

        return response;
      } catch (error) {
        console.error("Rate limit middleware error:", error);
        // En caso de error, permitir la petición
        return await handler(request);
      }
    };
  };
}

/**
 * Función para obtener identificador basado en usuario autenticado
 */
export async function getUserIdentifier(request: NextRequest): Promise<string> {
  try {
    const authHeader = request.headers.get("authorization");
    if (!authHeader) {
      // Fallback a IP si no hay usuario autenticado
      return (
        request.headers.get("x-forwarded-for") ||
        request.headers.get("x-real-ip") ||
        "anonymous"
      );
    }

    const token = authHeader.replace("Bearer ", "");

    // Aquí podrías decodificar el JWT para obtener el user ID
    // Por simplicidad, usar el token como identificador
    return `user:${token.substring(0, 10)}`;
  } catch {
    return "anonymous";
  }
}

/**
 * Función para limpiar cache expirado manualmente (opcional)
 */
export function cleanupExpiredEntries() {
  const keys = rateLimitCache.keys();
  const now = Date.now();

  for (const key of keys) {
    const data = rateLimitCache.get<RateLimitData>(key);
    if (data && now >= data.resetTime) {
      rateLimitCache.del(key);
    }
  }
}

/**
 * Función para obtener estadísticas de rate limiting
 */
export function getRateLimitStats() {
  return {
    totalKeys: rateLimitCache.keys().length,
    stats: rateLimitCache.getStats(),
  };
}
