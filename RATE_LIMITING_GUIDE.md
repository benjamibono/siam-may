# Sistema de Rate Limiting - Siam May

Este documento describe el sistema de rate limiting implementado para prevenir el uso excesivo de la aplicación web.

## Características Principales

### 🛡️ Protección Implementada

1. **Inscripciones/Desinscripciones**: 10 acciones por minuto
2. **Inicio de Sesión**: 5 intentos cada 15 minutos
3. **Cambios de Perfil**: 3 cambios cada 5 minutos
4. **Cambios de Contraseña**: 3 intentos cada 15 minutos
5. **Cambios de Email**: 2 intentos cada 30 minutos
6. **Refrescos Generales**: 30 refrescos por minuto

### 🔧 Tecnología Utilizada

- **Backend**: Node.js con NodeCache para almacenamiento en memoria
- **Middleware**: Sistema de middleware personalizado con Next.js
- **Identificación**: Basada en usuario autenticado o IP como fallback

## Endpoints Protegidos

### 📚 Inscripciones de Clases

- **Endpoint**: `/api/classes/enroll`
- **Límite**: 10 acciones/minuto
- **Acciones**: Inscribirse y desinscribirse de clases

### 🔐 Autenticación

- **Endpoint**: `/api/auth/login`
- **Límite**: 5 intentos/15 minutos
- **Identificador**: IP + Email para mayor especificidad

### 👤 Gestión de Perfil

- **Endpoint**: `/api/users/[id]` (PUT)
- **Límite**: 3 cambios/5 minutos
- **Acciones**: Actualización de datos personales

### 🔑 Cambio de Contraseña

- **Endpoint**: `/api/users/[id]/reset-password`
- **Límite**: 3 intentos/15 minutos

### 📧 Cambio de Email

- **Endpoint**: `/api/users/[id]/change-email`
- **Límite**: 2 intentos/30 minutos

### 📊 Consultas Generales

- **Endpoint**: `/api/admin/classes`, `/api/user/profile`
- **Límite**: 30 refrescos/minuto

## Respuesta de Rate Limiting

### Cuando se excede el límite:

```json
{
  "error": "Límite de 10 peticiones alcanzado. Inténtalo de nuevo en 45 segundos.",
  "rateLimitInfo": {
    "limit": 10,
    "remaining": 0,
    "reset": 1704067200000
  }
}
```

### Headers HTTP incluidos:

- `X-RateLimit-Limit`: Límite máximo
- `X-RateLimit-Remaining`: Intentos restantes
- `X-RateLimit-Reset`: Timestamp de reset

## Integración Frontend

### Manejo de Errores de Rate Limiting

```typescript
import { handleEnrollment, formatRateLimitError } from "@/lib/enrollment-api";

// Ejemplo de uso
const result = await handleEnrollment("enroll", classId);
if (!result.success && result.rateLimitInfo) {
  const errorMessage = formatRateLimitError(result.error, result.rateLimitInfo);
  toast.error(errorMessage);
}
```

### Componente Visual

```tsx
import { RateLimitIndicator } from "@/components/RateLimitIndicator";

<RateLimitIndicator rateLimitInfo={rateLimitInfo} action="inscripciones" />;
```

## Configuración

### Límites Personalizables

Los límites se pueden ajustar en `/src/lib/rate-limit.ts`:

```typescript
export const RATE_LIMITS = {
  ENROLLMENT: {
    maxRequests: 10, // Número máximo de peticiones
    windowMs: 60 * 1000, // Ventana de tiempo en ms
  },
  LOGIN: {
    maxRequests: 5,
    windowMs: 15 * 60 * 1000, // 15 minutos
  },
  // ... más configuraciones
};
```

## Monitoreo

### Estadísticas de Rate Limiting

```typescript
import { getRateLimitStats } from "@/lib/rate-limit";

const stats = getRateLimitStats();
console.log("Total de claves activas:", stats.totalKeys);
console.log("Estadísticas del cache:", stats.stats);
```

### Limpieza Manual

```typescript
import { cleanupExpiredEntries } from "@/lib/rate-limit";

// Limpiar entradas expiradas manualmente
cleanupExpiredEntries();
```

## Beneficios del Sistema

### 🔒 Seguridad

- Previene ataques de fuerza bruta en login
- Evita spam de inscripciones/desinscripciones
- Protege contra cambios masivos de datos

### ⚡ Rendimiento

- Reduce carga en la base de datos
- Evita refrescos excesivos
- Mantiene la aplicación responsive

### 👥 Experiencia de Usuario

- Mensajes claros sobre límites
- Indicadores visuales del estado
- Tiempos de espera informativos

## Casos de Uso Bloqueados

1. **Usuario malintencionado** intentando inscribirse/desinscribirse repetidamente
2. **Ataques de fuerza bruta** en el sistema de login
3. **Refrescos excesivos** que sobrecarguen el servidor
4. **Cambios masivos** de datos personales
5. **Spam de reset** de contraseña o email

## Próximas Mejoras

- [ ] Integración con Redis para múltiples instancias
- [ ] Dashboard de monitoreo en tiempo real
- [ ] Límites dinámicos basados en carga del servidor
- [ ] Whitelist para usuarios administradores
- [ ] Alertas automáticas por actividad sospechosa

## Mantenimiento

### Limpieza Automática

El sistema utiliza TTL (Time To Live) para limpiar automáticamente las entradas expiradas.

### Reinicio del Sistema

Al reiniciar la aplicación, todos los contadores se resetean automáticamente.

### Logs y Debugging

Los errores se loguean en la consola del servidor para facilitar el debugging.

---

**Implementado**: Diciembre 2024  
**Versión**: 1.0  
**Mantenedor**: Equipo de Desarrollo Siam May
