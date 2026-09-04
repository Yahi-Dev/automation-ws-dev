// src/app/api/consent-events/route.ts
// Consulta del historial de consentimiento.
//
// `consent_events` era una tabla de SOLO ESCRITURA: se alimentaba desde el
// webhook entrante y desde la pantalla de contacto, pero ningun endpoint ni
// pantalla la leia. Es decir, la prueba legal del opt-in existia pero era
// imposible de consultar o de entregar ante una reclamacion, que es justo para
// lo que sirve.
//
// GET  /api/consent-events            -> historial paginado (filtros opcionales)
// GET  /api/consent-events?format=csv -> exportacion para entregar como prueba
import { NextRequest } from "next/server";
import { requireAuth } from "@/src/lib/authz";
import prisma from "@/src/lib/prisma";
import { HttpResponse } from "@/src/utils/httpResponse";
import { parsePagination, keysetArgs } from "@/src/lib/pagination";
import { Prisma } from "@prisma/client";

export const runtime = "nodejs";

/** Escapa un campo para CSV: comillas dobles y separadores no rompen la fila. */
function csvCampo(valor: unknown): string {
  const s = valor == null ? "" : String(valor);
  return `"${s.replace(/"/g, '""')}"`;
}

export async function GET(req: NextRequest) {
  try {
    const gate = await requireAuth(req);
    if ("response" in gate) return gate.response;

    const { searchParams } = new URL(req.url);
    const contactId = searchParams.get("contactId");
    const event = searchParams.get("event")?.trim();
    const source = searchParams.get("source")?.trim();
    const formato = searchParams.get("format");

    const where: Prisma.consentEventsWhereInput = {
      ...(contactId && Number.isInteger(Number(contactId))
        ? { contactId: Number(contactId) }
        : {}),
      ...(event === "opt_in" || event === "opt_out" ? { event } : {}),
      ...(source ? { source } : {}),
    };

    const incluirContacto = {
      contact: { select: { id: true, name: true, phone: true, consentState: true } },
    };

    // Exportacion: sirve al derecho de acceso y a poder entregar la prueba del
    // consentimiento. Se acota a 10.000 filas para no construir en memoria una
    // respuesta sin limite.
    if (formato === "csv") {
      const filas = await prisma.consentEvents.findMany({
        where,
        include: incluirContacto,
        orderBy: { id: "desc" },
        take: 10_000,
      });

      const cabecera = [
        "id",
        "fecha",
        "contacto_id",
        "contacto_nombre",
        "contacto_telefono",
        "evento",
        "origen",
        "palabra_clave",
        "evidencia",
        "registrado_por",
      ].join(",");

      const cuerpo = filas.map((f) =>
        [
          f.id,
          f.createdAt.toISOString(),
          f.contactId,
          f.contact?.name ?? "",
          f.contact?.phone ?? "",
          f.event,
          f.source ?? "",
          f.keyword ?? "",
          f.raw ?? "",
          f.createdBy ?? "",
        ]
          .map(csvCampo)
          .join(",")
      );

      // El BOM hace que Excel abra el archivo en UTF-8 y no rompa los acentos.
      const csv = "﻿" + [cabecera, ...cuerpo].join("\r\n");

      return new Response(csv, {
        status: 200,
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": 'attachment; filename="consentimientos.csv"',
        },
      });
    }

    const { limit, cursor } = parsePagination(searchParams);

    const eventos = await prisma.consentEvents.findMany({
      where,
      include: incluirContacto,
      ...keysetArgs(limit, cursor),
    });

    return HttpResponse.sendSuccess(
      { Data: eventos, Total: eventos.length },
      "Historial de consentimiento obtenido"
    );
  } catch (error) {
    return HttpResponse.sendServerError("Error al obtener el historial de consentimiento", error);
  }
}
