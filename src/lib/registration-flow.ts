export type RegistrationFlow = "OLD" | "NEW_ADMIN_APPROVAL";

/**
 * HARD-CODE: Cambia este valor para elegir el flujo de registro.
 * - "OLD": tu flujo actual (verificación por email + usuario crea password)
 * - "NEW_ADMIN_APPROVAL": nuevo flujo con aprobación del admin (envío de password luego de aprobar)
 */
export const REGISTRATION_FLOW: RegistrationFlow = "NEW_ADMIN_APPROVAL";
