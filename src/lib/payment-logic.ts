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
 * Verifica si un pago de seguro médico es válido (no ha pasado más de un año)
 */
export function isValidMedicalInsurance(lastMedicalInsuranceDate: string | null): boolean {
  if (!lastMedicalInsuranceDate) return false;

  const insuranceDate = new Date(lastMedicalInsuranceDate);
  const now = new Date();
  
  // Calcular la diferencia en años
  const yearDiff = now.getFullYear() - insuranceDate.getFullYear();
  const monthDiff = now.getMonth() - insuranceDate.getMonth();
  const dayDiff = now.getDate() - insuranceDate.getDate();

  // El seguro es válido si no ha pasado más de un año
  return yearDiff === 0 || (yearDiff === 1 && monthDiff < 0) || (yearDiff === 1 && monthDiff === 0 && dayDiff < 0);
}

/**
 * Determina si un usuario puede inscribirse a clases según su estado, la fecha actual y el seguro médico
 */
export function canEnrollInClasses(userStatus: string, hasMedicalInsurance: boolean = false): boolean {
  const dayOfMonth = getCurrentDayOfMonth();

  // Si no tiene seguro médico válido, no puede inscribirse
  if (!hasMedicalInsurance) return false;

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
export function getEnrollmentStatusMessage(userStatus: string, hasMedicalInsurance: boolean = false): string {
  if (!hasMedicalInsurance) {
    return "Necesitas tener un seguro médico válido para poder inscribirte en las clases.";
  }

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
 * Determina si una clase está permitida según el concepto de pago del usuario
 */
export function canEnrollInClassType(
  className: string,
  paymentConcept: string | null
): boolean {
  if (!paymentConcept) return false;

  switch (paymentConcept) {
    case "Cuota mensual Muay Thai":
      return className === "Muay Thai";
    case "Cuota mensual MMA":
      return className === "MMA";
    case "Cuota mensual Muay Thai + MMA":
      return true; // Puede inscribirse en ambas
    case "Matrícula":
      return false; // La matrícula no da acceso a clases
    case "Seguro Médico":
      return false; // El seguro médico no da acceso a clases
    default:
      return false;
  }
}

/**
 * Obtiene el mensaje de restricción de clase
 */
export function getClassRestrictionMessage(
  className: string,
  paymentConcept: string | null
): string {
  if (!paymentConcept) {
    return "No tienes una cuota mensual válida. Necesitas pagar la cuota mensual correspondiente para acceder a las clases.";
  }

  switch (paymentConcept) {
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
    case "Seguro Médico":
      return "El seguro médico no incluye acceso a clases. Necesitas pagar la cuota mensual correspondiente.";
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
 * Determina el nuevo estado de un usuario según su estado actual, los pagos y el seguro médico
 */
export function getNewUserStatus(
  currentStatus: string,
  hasCurrentMonthPayment: boolean,
  role: string = "user",
  hasMedicalInsurance: boolean = false
): string {
  // Admins and staff are always active and exempt from payment status changes
  if (role === "admin" || role === "staff") {
    return "active";
  }

  const dayOfMonth = getCurrentDayOfMonth();

  // Si tiene pago del mes actual y seguro médico válido, Al día
  if (hasCurrentMonthPayment && hasMedicalInsurance) {
    return "active";
  }

  // Si no tiene seguro médico o no tiene pago del mes actual
  if (dayOfMonth >= 15) {
    // A partir del día 15, suspender automáticamente
    return "suspended";
  } else if (dayOfMonth >= 1 && dayOfMonth <= 5) {
    // Del día 1 al 5, estado pending (período de gracia)
    return "pending";
  } else {
    // Del día 6 al 14, mantener pending pero sin poder inscribirse
    return "pending";
  }
}
