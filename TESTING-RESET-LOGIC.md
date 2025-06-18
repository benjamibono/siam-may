# 🧪 Guía de Testing - Sistema de Reset de Clases

## 📋 Resumen del Sistema

El sistema resetea automáticamente las clases **SOLO** cuando se cumplen estas condiciones:

1. **Es día de clase** (ej: Lunes para una clase "Lunes 19:00-20:00")
2. **Ya pasó la hora de fin** (ej: después de las 20:00)

## 🚀 Métodos de Prueba

### 1. **Prueba Automática Completa**

```bash
# Ejecutar el servidor en desarrollo
npm run dev

# En otra terminal, ejecutar las pruebas
npm run test:reset:dev
```

### 2. **Prueba Manual vía API**

```bash
# Estado actual
curl http://localhost:3000/api/test/reset-logic

# Simulación específica
curl -X POST http://localhost:3000/api/test/reset-logic \
  -H "Content-Type: application/json" \
  -d '{"simulateDay": "Lunes", "simulateTime": "20:30"}'
```

### 3. **Verificar Logs del Cron Job**

El cron job se ejecuta cada 5 minutos y muestra logs detallados:

```
[CRON] ========================================
[CRON] Iniciando reinicio automático de clases
[CRON] Fecha: 16/12/2024
[CRON] Hora: 20:30
[CRON] Día: Lunes
[CRON] ========================================
[CRON] Análisis de clases:
[CRON]   - MMA Principiantes (Lunes 19:00-20:00): ✅ RESETEAR
[CRON]   - Boxing Avanzado (Martes 18:00-19:00): ❌ NO RESETEAR
```

## 🔍 Casos de Prueba

### ✅ **Casos que SÍ deben resetear:**

- Lunes 20:01 → Clase "Lunes 19:00-20:00" ✅
- Miércoles 19:31 → Clase "Miércoles 18:30-19:30" ✅
- Viernes 21:00 → Clase "Viernes 20:00-21:00" ✅

### ❌ **Casos que NO deben resetear:**

- Lunes 19:30 → Clase "Lunes 19:00-20:00" (aún en curso) ❌
- Martes 20:01 → Clase "Lunes 19:00-20:00" (no es lunes) ❌
- Lunes 18:00 → Clase "Lunes 19:00-20:00" (aún no empieza) ❌

## 🛠️ Scripts de Testing Disponibles

```json
{
  "test:reset": "node test-reset-logic.mjs",
  "test:reset:dev": "node test-reset-logic.mjs 3000"
}
```

## 📊 Interpretación de Resultados

### **Estado Actual**

```json
{
  "currentInfo": {
    "date": "16/12/2024",
    "time": "20:30",
    "day": "Lunes"
  },
  "summary": {
    "totalClasses": 3,
    "classesToReset": 1,
    "classesToResetNames": ["MMA Principiantes"]
  }
}
```

### **Simulaciones**

```json
{
  "simulation": {
    "day": "Lunes",
    "time": "20:30"
  },
  "summary": {
    "wouldResetCount": 1,
    "wouldResetNames": ["MMA Principiantes"]
  }
}
```

## 🔐 Verificación de Seguridad

El sistema tiene protecciones integradas:

1. **Verificación de horario**: Solo resetea si `currentTime > endTime`
2. **Verificación de día**: Solo resetea si es día de clase
3. **Logs detallados**: Cada ejecución queda registrada
4. **API de testing**: Permite verificar sin afectar datos reales

## ⏰ Monitoreo en Producción

### **Vercel Logs**

```bash
vercel logs [deployment-url] --follow
```

### **Endpoints de Monitoreo**

- `GET /api/test/reset-logic` - Estado actual
- `POST /api/test/reset-logic` - Simulaciones
- `GET /api/cron/reset-classes` - Forzar ejecución (solo con CRON_SECRET)

## 🚨 Solución de Problemas

### **Si el cron no se ejecuta:**

1. Verificar `vercel.json` tiene la configuración correcta
2. Verificar `CRON_SECRET` en variables de entorno
3. Revisar logs de Vercel

### **Si resetea clases incorrectamente:**

1. Ejecutar `npm run test:reset:dev`
2. Verificar formato de horarios en la DB
3. Revisar logs del cron job

### **Para probar cambios:**

1. Modificar lógica en `src/lib/class-schedule.ts`
2. Ejecutar pruebas: `npm run test:reset:dev`
3. Verificar resultados antes de desplegar

## 📈 Métricas de Verificación

- ✅ **Solo resetea clases que han terminado HOY**
- ✅ **NO resetea clases de otros días**
- ✅ **NO resetea clases en curso**
- ✅ **Logs claros y detallados**
- ✅ **API de testing funcional**
