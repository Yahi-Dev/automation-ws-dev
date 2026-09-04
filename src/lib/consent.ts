// src/lib/consent.ts
// Lógica central de consentimiento (opt-in / opt-out) para cumplimiento legal.
import prisma from "./prisma";

export type ConsentEvent = "opt_in" | "opt_out";
export type ConsentState = "opted_in" | "opted_out" | "unknown";

// Palabras clave entrantes que disparan baja/alta (primer token del mensaje).
export const OPT_OUT_KEYWORDS = ["stop", "baja", "cancelar", "unsubscribe", "salir"];
export const OPT_IN_KEYWORDS = ["start", "alta", "subscribe", "unstop"];

/**
 * Frases COMPLETAS que se aceptan como baja/alta.
 *
 * Se comparan contra el mensaje ENTERO ya normalizado, nunca como subcadena:
 * ver el comentario de `detectConsentKeyword` para el motivo.
 */
export const OPT_OUT_PHRASES = [
  "darme de baja",
  "dar de baja",
  "quiero darme de baja",
  "quiero dar de baja",
  "me quiero dar de baja",
  "deseo darme de baja",
  "solicito darme de baja",
  "no me escribas mas",
  "no me escriban mas",
  "no me escribas",
  "no quiero recibir mas mensajes",
  "no quiero recibir mensajes",
  "dejar de recibir",
  "dejar de recibir mensajes",
  "quiero dejar de recibir",
  "quiero dejar de recibir mensajes",
  "unsubscribe me",
  "remove me",
  "stop messages",
];

export const OPT_IN_PHRASES = [
  "darme de alta",
  "dar de alta",
  "quiero darme de alta",
  "quiero suscribirme",
  "deseo suscribirme",
  "subscribe me",
];

// Cortesias que se recortan antes de comparar la frase, para que "hola, quiero
// darme de baja, gracias" cuente igual que "quiero darme de baja".
const PREFIJOS_CORTESIA = [
  "hola",
  "buenas",
  "buenos dias",
  "buenas tardes",
  "buenas noches",
  "por favor",
  "porfavor",
  "porfa",
];
const SUFIJOS_CORTESIA = ["por favor", "porfavor", "porfa", "gracias", "please", "thanks"];

/**
 * Normaliza el texto entrante: sin acentos, en minusculas, con la puntuacion
 * convertida en espacios. Asi "¡BAJA!", "Baja." y "baja" son el mismo texto.
 */
function normalizarTexto(texto: string): string {
  return (texto || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // quita las tildes y dieresis ya separadas por NFD
    .toLowerCase()
    .replace(/[^a-z0-9\s]+/g, " ") // puntuacion y emojis -> espacio
    .replace(/\s+/g, " ")
    .trim();
}

/** Recorta saludos y despedidas del principio y del final, sin vaciar el texto. */
function quitarCortesia(texto: string): string {
  let t = texto;
  let hubocambio = true;
  while (hubocambio) {
    hubocambio = false;
    for (const p of PREFIJOS_CORTESIA) {
      if (t.startsWith(`${p} `)) {
        t = t.slice(p.length + 1);
        hubocambio = true;
      }
    }
    for (const s of SUFIJOS_CORTESIA) {
      if (t.endsWith(` ${s}`)) {
        t = t.slice(0, t.length - s.length - 1);
        hubocambio = true;
      }
    }
  }
  return t.trim();
}

/**
 * Detecta si el cuerpo de un mensaje entrante es una palabra clave de consentimiento.
 *
 * LA DETECCION ES DELIBERADAMENTE CONSERVADORA. Un falso negativo se corrige
 * solo: el destinatario vuelve a escribir "BAJA" o el operador lo da de baja a
 * mano desde la ficha del contacto, y ademas el mensaje queda guardado en
 * `inbound_messages` para revisarlo. Un falso positivo, en cambio, da de baja a
 * alguien que no lo pidio y esa persona deja de recibir sin enterarse; con el
 * opt-in exigido por defecto, recuperarla requiere que ella misma escriba ALTA.
 *
 * De ahi las dos unicas reglas admitidas:
 *   1. PRIMER TOKEN del mensaje igual a una palabra clave ("STOP.", "¡BAJA!").
 *   2. MENSAJE ENTERO igual a una frase de la lista, tras recortar cortesias.
 *
 * Nunca se busca la palabra o la frase como SUBCADENA. Por eso siguen sin
 * detectarse -a proposito- casos como "no quiero darme de baja todavia" o
 * "me dieron de baja en el gimnasio, ¿siguen abiertos?": ahi la intencion no
 * esta clara y el coste de equivocarse recae sobre el destinatario.
 */
export function detectConsentKeyword(body: string): {
  type: ConsentEvent | null;
  keyword: string | null;
} {
  const texto = normalizarTexto(body);
  if (!texto) return { type: null, keyword: null };

  // Regla 1: primer token.
  const first = texto.split(" ")[0] ?? "";
  if (OPT_OUT_KEYWORDS.includes(first)) return { type: "opt_out", keyword: first };
  if (OPT_IN_KEYWORDS.includes(first)) return { type: "opt_in", keyword: first };

  // Regla 2: frase exacta (mensaje entero), sin saludos ni despedidas.
  const frase = quitarCortesia(texto);
  if (OPT_OUT_PHRASES.includes(frase)) return { type: "opt_out", keyword: frase };
  if (OPT_IN_PHRASES.includes(frase)) return { type: "opt_in", keyword: frase };

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
