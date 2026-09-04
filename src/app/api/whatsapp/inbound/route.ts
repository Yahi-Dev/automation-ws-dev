// src/app/api/whatsapp/inbound/route.ts
// Recibe mensajes ENTRANTES de WhatsApp (Twilio "A message comes in") y procesa
// palabras clave de consentimiento: STOP/BAJA -> opt-out, ALTA/START -> opt-in.
// Es distinto del statusCallback (webhook/route.ts), que solo trae estados.
import { createHash } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import prisma from "@/src/lib/prisma";
import { redis } from "@/src/lib/redis";
import {
  detectConsentKeyword,
  findContactByPhone,
  applyConsent,
  normalizeInboundPhone,
} from "@/src/lib/consent";
import { getTwilioConfig } from "@/src/lib/app-config";
import { isValidTwilioSignature, formToParams } from "@/src/lib/twilio-webhook";
import { safeEqual } from "@/src/lib/safe-compare";

import { yaProcesado } from "@/src/lib/webhook-replay";

export const runtime = "nodejs";

/** Tope de tamano del cuerpo entrante de Twilio. */
const MAX_BODY_BYTES = 64 * 1024;

const CONTACTS_CACHE_KEY = "contacts-cache";

/** Topes de las columnas de `inbound_messages`, para no fallar por longitud. */
const MAX_TEXTO = 4000;
const MAX_TELEFONO = 32;
const MAX_SID = 128;

/** Que se hizo con el mensaje entrante (columna `handledAs`). */
type TratamientoEntrante = "opt_in" | "opt_out" | "ninguno" | "contacto_desconocido";

function recorta(valor: string, max: number): string {
  return valor.length > max ? valor.slice(0, max) : valor;
}

/**
 * Guarda el mensaje entrante en `inbound_messages`.
 *
 * Antes el cuerpo se leia solo para buscar palabras clave y se descartaba: un
 * "quiero darme de baja" escrito por un numero no registrado desaparecia sin
 * dejar rastro y nadie podia atenderlo. Ahora se guarda SIEMPRE, haya o no
 * palabra clave y este o no el remitente en la agenda.
 *
 * `providerSid` es UNICO: si Twilio reenvia el mismo mensaje, el choque P2002
 * se ignora a proposito (ya lo teniamos) en vez de tumbar la peticion.
 */
async function persistirEntrante(datos: {
  fromPhone: string;
  body: string;
  providerSid: string | null;
  handledAs: TratamientoEntrante;
  keyword: string | null;
  contactId: number | null;
}): Promise<void> {
  try {
    const telefono = recorta(datos.fromPhone, MAX_TELEFONO);
    const texto = recorta(datos.body, MAX_TEXTO);

    // Si el proveedor no manda identificador, se sintetiza uno determinista.
    //
    // MySQL admite MULTIPLES NULL en un indice unico, asi que dejarlo a null
    // desactivaba la deduplicacion justo para los mensajes que no traen SID: un
    // reintento del proveedor creaba una fila repetida en el historial. La clave
    // sintetica agrupa por remitente, contenido y minuto: dos entregas del mismo
    // mensaje colapsan, y dos mensajes identicos enviados a proposito con un
    // minuto de diferencia siguen contando como dos.
    const sid = datos.providerSid
      ? recorta(datos.providerSid, MAX_SID)
      : `sin-sid:${createHash("sha256")
          .update(`${telefono}|${texto}|${new Date().toISOString().slice(0, 16)}`)
          .digest("hex")
          .slice(0, 40)}`;

    await prisma.inboundMessages.create({
      data: {
        fromPhone: telefono,
        body: texto,
        providerSid: sid,
        handledAs: datos.handledAs,
        keyword: datos.keyword,
        contactId: datos.contactId,
      },
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return; // duplicado por providerSid: reenvio de Twilio, ya esta registrado
    }
    throw error; // cualquier otro fallo sube y responde 5xx para que Twilio reintente
  }
}

/** Respuesta TwiML (Twilio la usa para auto-responder). */
function twiml(message?: string) {
  const inner = message ? `<Message>${escapeXml(message)}</Message>` : "";
  return new NextResponse(
    `<?xml version="1.0" encoding="UTF-8"?><Response>${inner}</Response>`,
    { status: 200, headers: { "Content-Type": "text/xml" } }
  );
}

function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export async function POST(req: NextRequest) {
  try {
    // Protección opcional por secreto compartido (?token=...)
    const { webhookSecret } = await getTwilioConfig();
    if (webhookSecret) {
      const token = req.nextUrl.searchParams.get("token");
      if (!safeEqual(token, webhookSecret)) return new NextResponse("Forbidden", { status: 403 });
    }

    // Tope de tamano ANTES de parsear: formData() bufferiza el cuerpo entero y
    // esta ruta no tiene rate-limit (la llama Twilio, no un usuario).
    const declarado = Number(req.headers.get("content-length") ?? 0);
    if (declarado > MAX_BODY_BYTES) {
      return new NextResponse("Payload too large", { status: 413 });
    }

    const form = await req.formData();

    // Validación de firma (opt-in): rechaza peticiones no firmadas por Twilio.
    if (!(await isValidTwilioSignature(req, formToParams(form)))) {
      return new NextResponse("Invalid signature", { status: 403 });
    }

    const from = String(form.get("From") ?? "");
    const body = String(form.get("Body") ?? "");
    // Sin remitente no hay nada que registrar ni a quien responder.
    if (!from) return twiml();

    const sid = String(form.get("MessageSid") ?? form.get("SmsMessageSid") ?? "");
    const { type, keyword } = detectConsentKeyword(body);
    const contact = await findContactByPhone(from);

    // Que se hizo con el mensaje. Si el remitente no esta en la agenda, no se
    // aplica consentimiento alguno aunque traiga palabra clave: queda marcado
    // como `contacto_desconocido` para que alguien lo atienda desde la pantalla
    // de entrantes (vincularlo a un contacto o darlo de baja a mano).
    const handledAs: TratamientoEntrante = !contact
      ? "contacto_desconocido"
      : (type ?? "ninguno");

    // Se guarda ANTES de decidir nada: aunque despues no haya accion que tomar,
    // el mensaje ya no se pierde.
    await persistirEntrante({
      fromPhone: normalizeInboundPhone(from),
      body,
      providerSid: sid || null,
      handledAs,
      keyword: keyword ?? null,
      contactId: contact?.id ?? null,
    });

    if (!type) return twiml(); // no es palabra clave de consentimiento: no auto-responder
    if (!contact) return twiml(); // remitente desconocido: ya quedo registrado

    // ANTI-REPLAY: la firma de Twilio no lleva marca temporal ni nonce, asi que
    // una peticion capturada se puede reenviar indefinidamente. Sin esto, un
    // replay de un "ALTA" antiguo podia REVERTIR una baja posterior.
    const claveEvento = sid ? `inbound:${sid}` : `inbound:${from}:${type}:${body.slice(0, 40)}`;
    if (await yaProcesado(claveEvento)) return twiml();

    await applyConsent({
      contactId: contact.id,
      event: type,
      source: "inbound",
      keyword,
      raw: body,
    });
    await redis.del(CONTACTS_CACHE_KEY).catch(() => {});

    const reply =
      type === "opt_out"
        ? "Has sido dado de baja y no recibirás más mensajes. Responde ALTA para volver a suscribirte."
        : "¡Suscripción confirmada! Volverás a recibir nuestros mensajes.";
    return twiml(reply);
  } catch (error) {
    console.error("Inbound webhook error:", error);
    // 500, NO 200. Antes se respondia 200 ante cualquier excepcion propia, con
    // lo que una caida de la base de datos hacia que Twilio diera por entregada
    // una BAJA que nunca se registro: el contacto seguia recibiendo mensajes y
    // no quedaba ningun rastro. Con 5xx, Twilio reintenta.
    return new NextResponse("Internal error", { status: 500 });
  }
}
