// src/app/api/contacts/bulk-consent/route.ts
// Registro MASIVO de consentimiento (opt-in / opt-out) sobre contactos ya existentes.
//
// Por que existe: hasta ahora los contactos importados nacian con
// consentState = "unknown" y no habia ninguna forma de darles opt-in salvo uno
// a uno. Con `requireOptIn` activo eso dejaba listas enteras inutilizables.
//
// Es una operacion sensible: convierte "no sabemos si aceptaron" en "aceptaron".
// Por eso exige rol de administrador, evidencia escrita, y deja una fila de
// auditoria por contacto en `consent_events`.
import { NextRequest } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/src/lib/authz";
import { enforceApiLimit } from "@/src/lib/api-rate-limit";
import prisma from "@/src/lib/prisma";
import { redis } from "@/src/lib/redis";
import { HttpResponse } from "@/src/utils/httpResponse";

export const runtime = "nodejs";
export const maxDuration = 300;

const TAMANO_LOTE = 500;

const bulkConsentSchema = z.object({
  contactIds: z.array(z.number().int().positive()).min(1).max(10_000),
  event: z.enum(["opt_in", "opt_out"]),
  // La evidencia es obligatoria: es lo unico que hace defendible el registro
  // ante una reclamacion. Sin ella, esto seria un boton para inventar opt-ins.
  evidence: z
    .string()
    .trim()
    .min(10, "Describe la evidencia del consentimiento (mínimo 10 caracteres)")
    .max(1000),
  source: z.enum(["manual", "import", "api"]).default("manual"),
});

export async function POST(req: NextRequest) {
  try {
    const gate = await requireAdmin(req);
    if ("response" in gate) return gate.response;

    const actor = gate.user.email ?? "system";

    const limite = await enforceApiLimit("consent-write", actor);
    if (limite) return limite;

    const parsed = bulkConsentSchema.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) {
      return HttpResponse.sendBadRequest("Datos inválidos", parsed.error.flatten());
    }

    const { contactIds, event, evidence, source } = parsed.data;
    const esOptOut = event === "opt_out";
    const ahora = new Date();

    // Se descartan los ids inexistentes o borrados ANTES de escribir, para que
    // el recuento devuelto sea el real y no incluya ids inventados.
    const existentes = await prisma.contacts.findMany({
      where: { id: { in: contactIds }, isDeleted: false },
      select: { id: true },
    });

    if (existentes.length === 0) {
      return HttpResponse.sendBadRequest("Ninguno de los contactos indicados existe");
    }

    const ids = existentes.map((c) => c.id);

    const datosContacto = esOptOut
      ? {
          consentState: "opted_out",
          optOutAt: ahora,
          optOutKeyword: null,
          consentSource: source,
          updatedBy: actor,
          updatedAt: ahora,
        }
      : {
          consentState: "opted_in",
          consentAt: ahora,
          optOutAt: null,
          optOutKeyword: null,
          consentSource: source,
          updatedBy: actor,
          updatedAt: ahora,
        };

    let actualizados = 0;

    // Por lotes y en transaccion: el estado del contacto y su prueba de
    // auditoria se escriben juntos o no se escribe ninguno de los dos.
    for (let i = 0; i < ids.length; i += TAMANO_LOTE) {
      const lote = ids.slice(i, i + TAMANO_LOTE);

      const [res] = await prisma.$transaction([
        prisma.contacts.updateMany({ where: { id: { in: lote } }, data: datosContacto }),
        prisma.consentEvents.createMany({
          data: lote.map((contactId) => ({
            contactId,
            event,
            source,
            raw: evidence,
            createdBy: actor,
          })),
        }),
      ]);

      actualizados += res.count;
    }

    await redis.del("contacts-cache").catch(() => {});

    const omitidos = contactIds.length - ids.length;

    return HttpResponse.sendSuccess(
      { Data: { actualizados, omitidos, event } },
      `${actualizados} contacto(s) marcados como ${esOptOut ? "baja (opt-out)" : "opt-in"}` +
        (omitidos > 0 ? ` · ${omitidos} id(s) ignorados por no existir` : "")
    );
  } catch (error) {
    return HttpResponse.sendServerError("Error al registrar el consentimiento", error);
  }
}
