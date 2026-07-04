// src/lib/consent.ts
// Lógica central de consentimiento (opt-in / opt-out) para cumplimiento legal.
import prisma from "./prisma";

export type ConsentEvent = "opt_in" | "opt_out";
export type ConsentState = "opted_in" | "opted_out" | "unknown";

// Palabras clave entrantes que disparan baja/alta (primer token del mensaje).
export const OPT_OUT_KEYWORDS = ["stop", "baja", "cancelar", "unsubscribe", "salir"];
export const OPT_IN_KEYWORDS = ["start", "alta", "subscribe", "unstop"];

/** Detecta si el cuerpo de un mensaje entrante es una palabra clave de consentimiento. */
export function detectConsentKeyword(body: string): {
  type: ConsentEvent | null;
  keyword: string | null;
} {
  const first = (body || "").trim().toLowerCase().split(/\s+/)[0] ?? "";
  if (OPT_OUT_KEYWORDS.includes(first)) return { type: "opt_out", keyword: first };
  if (OPT_IN_KEYWORDS.includes(first)) return { type: "opt_in", keyword: first };
  return { type: null, keyword: null };
}

/** Normaliza un teléfono entrante de Twilio (quita "whatsapp:") para buscar el contacto. */
export function normalizeInboundPhone(raw: string): string {
  return (raw || "").replace(/^whatsapp:/i, "").trim();
}

/** Busca un contacto activo por su teléfono E.164. */
export async function findContactByPhone(rawPhone: string) {
  const phone = normalizeInboundPhone(rawPhone);
  if (!phone) return null;
  return prisma.contacts.findFirst({
    where: { isDeleted: false, phone },
    select: { id: true, name: true, phone: true, consentState: true },
  });
}

/**
 * Aplica opt-in / opt-out a un contacto: actualiza su estado y registra el evento
 * en la tabla de auditoría `consent_events`, de forma atómica.
 */
export async function applyConsent(params: {
  contactId: number;
  event: ConsentEvent;
  source: string; // inbound | manual | import | api
  keyword?: string | null;
  raw?: string | null;
  actor?: string | null;
}) {
  const { contactId, event, source, keyword, raw, actor } = params;
  const now = new Date();
  const isOptOut = event === "opt_out";

  const data = isOptOut
    ? {
        consentState: "opted_out",
        optOutAt: now,
        optOutKeyword: keyword ?? null,
        consentSource: source,
        updatedBy: actor ?? "system",
        updatedAt: now,
      }
    : {
        consentState: "opted_in",
        consentAt: now,
        optOutAt: null,
        optOutKeyword: null,
        consentSource: source,
        updatedBy: actor ?? "system",
        updatedAt: now,
      };

  const [contact] = await prisma.$transaction([
    prisma.contacts.update({ where: { id: contactId }, data }),
    prisma.consentEvents.create({
      data: { contactId, event, source, keyword: keyword ?? null, raw: raw ?? null, createdBy: actor ?? null },
    }),
  ]);

  return contact;
}
