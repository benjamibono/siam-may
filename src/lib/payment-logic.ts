// Lógica de pagos y estados de usuarios

/**
 * Obtiene el día actual del mes
 */
export function getCurrentDayOfMonth(): number {
  return new Date().getDate();
}

/**
 * Obtiene el mes y año actuales
 */
export function getCurrentMonthYear(): { month: number; year: number } {
  const now = new Date();
  return {
    month: now.getMonth() + 1, // getMonth() devuelve 0-11
    year: now.getFullYear(),
  };
}

/**
 * Determina si un usuario puede inscribirse a clases según su estado y la fecha actual
 */
export function canEnrollInClasses(userStatus: string): boolean {
  const dayOfMonth = getCurrentDayOfMonth();

  switch (userStatus) {
    case "active":
      return true;
    case "pending":
      // Del día 1 al 5 pueden inscribirse como pendientes
      return dayOfMonth >= 1 && dayOfMonth <= 5;
    case "suspended":
      return false;
    default:
      return false;
  }
}

/**
 * Obtiene el mensaje de estado para mostrar al usuario
 */
export function getEnrollmentStatusMessage(userStatus: string): string {
  const dayOfMonth = getCurrentDayOfMonth();

  switch (userStatus) {
    case "active":
      return "";
    case "pending":
      if (dayOfMonth >= 1 && dayOfMonth <= 5) {
        return "Cuenta pendiente de pago. Puedes inscribirte hasta el día 5.";
      } else if (dayOfMonth >= 6 && dayOfMonth <= 10) {
        return "Cuenta pendiente de pago. No puedes inscribirte del día 6 al 10. Realiza el pago para reactivar tu cuenta.";
      } else {
        return "Cuenta pendiente de pago. Realiza el pago para reactivar tu cuenta.";
      }
    case "suspended":
      return "Cuenta suspendida. Contacta con el administrador.";
    default:
      return "Estado de cuenta desconocido.";
  }
}

/**
 * Determina si una clase está permitida según el último pago del usuario
 */
export function canEnrollInClassType(
  className: string,
  lastPaymentConcept: string | null
): boolean {
  if (!lastPaymentConcept) return false;

  const isCurrentMonth = true; // Esto se verificará en la implementación real

  if (!isCurrentMonth) return false;

  switch (lastPaymentConcept) {
    case "Cuota mensual Muay Thai":
      return className === "Muay Thai";
    case "Cuota mensual MMA":
      return className === "MMA";
    case "Cuota mensual Muay Thai + MMA":
      return true; // Puede inscribirse en ambas
    case "Matrícula":
      return false; // La matrícula no da acceso a clases
    default:
      return false;
  }
}

/**
 * Obtiene el mensaje de restricción de clase
 */
export function getClassRestrictionMessage(
  className: string,
  lastPaymentConcept: string | null
): string {
  if (!lastPaymentConcept) {
    return "No tienes pagos registrados para este mes.";
  }

  switch (lastPaymentConcept) {
    case "Cuota mensual Muay Thai":
      return className === "MMA"
        ? "Tu cuota actual solo incluye Muay Thai. Para acceder a MMA, necesitas la cuota combinada."
        : "";
    case "Cuota mensual MMA":
      return className === "Muay Thai"
        ? "Tu cuota actual solo incluye MMA. Para acceder a Muay Thai, necesitas la cuota combinada."
        : "";
    case "Cuota mensual Muay Thai + MMA":
      return "";
    case "Matrícula":
      return "La matrícula no incluye acceso a clases. Necesitas pagar la cuota mensual correspondiente.";
    default:
      return "Tipo de pago no reconocido.";
  }
}

/**
 * Verifica si un pago corresponde al mes actual
 */
export function isPaymentFromCurrentMonth(paymentDate: string): boolean {
  const payment = new Date(paymentDate);
  const now = new Date();

  return (
    payment.getMonth() === now.getMonth() &&
    payment.getFullYear() === now.getFullYear()
  );
}

/**
 * Determina el nuevo estado de un usuario según su estado actual y los pagos
 */
export function getNewUserStatus(
  currentStatus: string,
  hasCurrentMonthPayment: boolean
): string {
  const dayOfMonth = getCurrentDayOfMonth();

  // Si tiene pago del mes actual, siempre activo
  if (hasCurrentMonthPayment) {
    return "active";
  }

  // Si no tiene pago del mes actual, determinar estado según el día del mes
  if (dayOfMonth >= 15) {
    // A partir del día 15, suspender automáticamente si no hay pago
    return "suspended";
  } else if (dayOfMonth >= 1 && dayOfMonth <= 5) {
    // Del día 1 al 5, estado pending (período de gracia)
    return "pending";
  } else {
    // Del día 6 al 14, mantener pending pero sin poder inscribirse
    return "pending";
  }
}
