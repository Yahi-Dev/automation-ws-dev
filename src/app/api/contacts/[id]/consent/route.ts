// src/app/api/contacts/[id]/consent/route.ts
// Cambia manualmente el consentimiento de un contacto (opt-in / opt-out) desde la UI.
import { NextRequest } from "next/server";
import { requireAuth } from "@/src/lib/authz";
import prisma from "@/src/lib/prisma";
import { redis } from "@/src/lib/redis";
import { CatchError } from "@/src/utils/catchError";
import { HttpResponse } from "@/src/utils/httpResponse";
import { applyConsent, type ConsentEvent } from "@/src/lib/consent";

export const runtime = "nodejs";

const CONTACTS_CACHE_KEY = "contacts-cache";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const gate = await requireAuth(req);
    if ("response" in gate) return gate.response;

    const { id } = await params;
    const contactId = Number(id);
    if (!Number.isInteger(contactId) || contactId <= 0) {
      return HttpResponse.sendBadRequest("Id inválido");
    }

    const body = await req.json().catch(() => ({}));
    const event = body?.event as ConsentEvent;
    if (event !== "opt_in" && event !== "opt_out") {
      return HttpResponse.sendBadRequest("event debe ser 'opt_in' u 'opt_out'");
    }

    const contact = await prisma.contacts.findFirst({
      where: { id: contactId, isDeleted: false },
      select: { id: true },
    });
    if (!contact) {
      return HttpResponse.sendNotFound("Contacto no encontrado");
    }

    const [updated, error] = await CatchError(
      applyConsent({
        contactId,
        event,
        source: "manual",
        actor: gate.user.email ?? "system",
      })
    );
    if (error) {
      return HttpResponse.sendServerError("Error al actualizar el consentimiento", error);
    }

    await redis.del(CONTACTS_CACHE_KEY).catch(() => {});

    return HttpResponse.sendSuccess(
      { Data: updated },
      event === "opt_out" ? "Contacto dado de baja (opt-out)" : "Contacto suscrito (opt-in)"
    );
  } catch (error) {
    return HttpResponse.sendServerError("Error interno del servidor", error);
  }
}
