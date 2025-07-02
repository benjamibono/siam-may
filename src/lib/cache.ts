// Constantes de cacheo y utilidades comunes

/** Tiempo en segundos (Next.js usa segundos) */
export const ONE_MINUTE = 60;
export const FIVE_MINUTES = 5 * ONE_MINUTE;
export const TEN_MINUTES = 10 * ONE_MINUTE;
export const ONE_HOUR = 60 * ONE_MINUTE;
export const SIX_HOURS = 6 * ONE_HOUR;
export const ONE_DAY = 24 * ONE_HOUR;

/** Tags estandarizados para revalidación on-demand */
export const TAGS = {
  CLASSES: "classes",
  USERS: "users",
  PAYMENTS: "payments",
  PROFILE: "profile",
} as const; 