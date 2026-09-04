// src/app/api/contacts/import/route.ts
// Importa contactos desde un archivo CSV o Excel (.xlsx) (columnas: nombre, telefono, pais).
// Valida y normaliza cada teléfono a E.164 con libphonenumber-js y omite duplicados.
import { NextRequest } from "next/server";
import { parsePhoneNumberFromString, type CountryCode } from "libphonenumber-js";
import { requireAuth } from "@/src/lib/authz";
import { parseContactsFile } from "@/src/lib/import-parser";
import { enforceApiLimit } from "@/src/lib/api-rate-limit";
import prisma from "@/src/lib/prisma";
import { redis } from "@/src/lib/redis";
import { HttpResponse } from "@/src/utils/httpResponse";

export const runtime = "nodejs";

const CONTACTS_CACHE_KEY = "contacts-cache";
const MAX_IMPORT_BYTES = Math.max(1, Number(process.env.CONTACTS_IMPORT_MAX_BYTES ?? 5 * 1024 * 1024));
const MAX_IMPORT_ROWS = Math.max(1, Number(process.env.CONTACTS_IMPORT_MAX_ROWS ?? 50_000));

/** Toma el valor de la primera columna cuyo encabezado coincida (case-insensitive). */
function pick(row: Record<string, string>, keys: string[]): string {
  for (const k of Object.keys(row)) {
    if (keys.includes(k.trim().toLowerCase())) return (row[k] ?? "").trim();
  }
  return "";
}

/**
 * Origenes de consentimiento admitidos al importar.
 *
 * "ninguno" es una respuesta legitima y es el valor por defecto: si no hay
 * prueba del opt-in, los contactos entran como `unknown` y no se les puede
 * enviar. Es preferible una lista inutilizable a una infraccion.
 */
const ORIGENES_CONSENTIMIENTO = [
  "ninguno",
  "formulario_web",
  "cliente_existente",
  "punto_de_venta",
  "otro",
] as const;

type Consentimiento =
  | { otorgado: false }
  | { otorgado: true; fecha: Date; evidencia: string };

function parseConsentimiento(form: FormData): Consentimiento | { error: string } {
  const origen = String(form.get("consentOrigin") ?? "ninguno").trim();

  if (!ORIGENES_CONSENTIMIENTO.includes(origen as (typeof ORIGENES_CONSENTIMIENTO)[number])) {
    return {
      error: `Origen de consentimiento no válido. Valores admitidos: ${ORIGENES_CONSENTIMIENTO.join(", ")}`,
    };
  }

  if (origen === "ninguno") return { otorgado: false };

  const evidencia = String(form.get("consentEvidence") ?? "").trim();
  if (evidencia.length < 10) {
    return {
      error:
        "Para declarar consentimiento hay que describir la evidencia (mínimo 10 caracteres): " +
        "de dónde salieron los contactos y qué aceptaron.",
    };
  }

  const fechaRaw = String(form.get("consentDate") ?? "").trim();
  let fecha = new Date();
  if (fechaRaw) {
    const d = new Date(fechaRaw);
    if (Number.isNaN(d.getTime())) return { error: "La fecha de consentimiento no es válida" };
    if (d.getTime() > Date.now()) return { error: "La fecha de consentimiento no puede ser futura" };
    fecha = d;
  }

  return {
    otorgado: true,
    fecha,
    evidencia: `[origen: ${origen}] ${evidencia}`.slice(0, 1000),
  };
}

export async function POST(req: NextRequest) {
  try {
    const gate = await requireAuth(req);
    if ("response" in gate) return gate.response;

    const limite = await enforceApiLimit("contacts-import", gate.user.email ?? "system");
    if (limite) return limite;

    // El tope se comprueba por Content-Length ANTES de `formData()`, que ya
    // bufferiza el cuerpo entero en memoria. Comprobarlo despues (como se hacia)
    // significa que un cuerpo de 1 GB llega integro a la RAM y solo entonces se
    // rechaza: los Route Handlers no tienen limite de tamano propio.
    const declarado = Number(req.headers.get("content-length") ?? 0);
    if (declarado > MAX_IMPORT_BYTES * 1.1) {
      return HttpResponse.sendBadRequest(
        `El archivo supera el máximo permitido (${Math.floor(MAX_IMPORT_BYTES / (1024 * 1024))}MB)`
      );
    }

    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File)) return HttpResponse.sendBadRequest("Archivo requerido");

    // Tope de tamaño real del archivo (el Content-Length incluye el resto del multipart).
    if (file.size > MAX_IMPORT_BYTES) {
      return HttpResponse.sendBadRequest(
        `El archivo supera el máximo permitido (${Math.floor(MAX_IMPORT_BYTES / (1024 * 1024))}MB)`
      );
    }

    // Procedencia del consentimiento. Es un requisito legal, no un adorno: sin
    // declarar de donde salio el opt-in, los contactos entran como "unknown" y
    // el gate de envio los rechaza. Quien importa asume la declaracion, y queda
    // registrada en consent_events junto a su evidencia.
    const consentimiento = parseConsentimiento(form);
    if ("error" in consentimiento) {
      return HttpResponse.sendBadRequest(consentimiento.error);
    }

    // El formato (CSV o .xlsx) se decide por los magic bytes del contenido, no
    // por la extension ni por `file.type`, que los controla el cliente. Ambos
    // backends devuelven la misma forma, asi que a partir de aqui da igual que
    // subio el usuario.
    // `erroresArchivo` recoge los fallos de formato (comillas sin cerrar,
    // columnas de mas, hoja ilegible...). Antes no se leian nunca y el archivo
    // se procesaba a medias sin decirselo a nadie.
    const { rows, errors: erroresArchivo } = await parseContactsFile(file);
    if (rows.length === 0) {
      // Si el lector supo por que no hay filas (Excel dañado, .xls antiguo,
      // archivo vacio), se le dice al usuario en vez de un mensaje generico.
      return HttpResponse.sendBadRequest(
        erroresArchivo[0]?.error ?? "El archivo no tiene filas válidas"
      );
    }
    if (rows.length > MAX_IMPORT_ROWS) {
      return HttpResponse.sendBadRequest(
        `Demasiadas filas (${rows.length}). Máximo permitido: ${MAX_IMPORT_ROWS}. Divide el archivo.`
      );
    }

    const actor = gate.user.email ?? "system";
    const errors: Array<{ row: number; error: string }> = [...erroresArchivo];
    const seenPhones = new Set<string>();

    // Marca de tiempo unica de ESTA importacion. Se usa despues para localizar
    // exactamente las filas insertadas ahora y poder auditarlas.
    const importadoEn = new Date();

    const toInsert: {
      name: string;
      phone: string;
      country: string | null;
      consentState: string;
      consentSource: string;
      consentAt: Date | null;
      createdBy: string;
      createdAt: Date;
    }[] = [];

    rows.forEach((row, idx) => {
      const line = idx + 2; // +1 encabezado, +1 base-1
      const name = pick(row, ["name", "nombre"]);
      const rawPhone = pick(row, ["phone", "telefono", "teléfono", "numero", "número", "celular"]);
      const rawCountry = pick(row, ["country", "pais", "país"]).toUpperCase();

      if (!name || !rawPhone) {
        errors.push({ row: line, error: "Falta nombre o teléfono" });
        return;
      }

      const pn = parsePhoneNumberFromString(rawPhone, (rawCountry || undefined) as CountryCode | undefined);
      if (!pn || !pn.isValid()) {
        errors.push({ row: line, error: `Teléfono inválido: ${rawPhone}` });
        return;
      }

      const e164 = pn.number;
      if (seenPhones.has(e164)) {
        errors.push({ row: line, error: `Duplicado en el archivo: ${e164}` });
        return;
      }
      seenPhones.add(e164);

      // `country` es VARCHAR(2). Antes se guardaba el valor crudo del CSV, asi
      // que una sola celda con "MEX" o "ESPANA" hacia fallar el createMany
      // ENTERO (error 1406 / P2000) y no se importaba absolutamente nada.
      // Ahora se prefiere el pais deducido del propio numero y, si el del
      // archivo no es un ISO-2 valido, simplemente se ignora.
      const paisIso2 =
        pn.country ?? (/^[A-Z]{2}$/.test(rawCountry) ? rawCountry : null);

      toInsert.push({
        name: name.slice(0, 150),
        phone: e164,
        country: paisIso2,
        // Aqui esta el bloqueo historico del producto: el importador NUNCA
        // fijaba consentState, con lo que todo contacto nacia "unknown" y, con
        // requireOptIn activo, cada mensaje fallaba con CONSENT_NOT_OPTED_IN.
        // Ahora el estado depende de la procedencia declarada por quien importa.
        consentState: consentimiento.otorgado ? "opted_in" : "unknown",
        consentSource: "import",
        consentAt: consentimiento.otorgado ? consentimiento.fecha : null,
        createdBy: actor,
        createdAt: importadoEn,
      });
    });

    let imported = 0;
    let dupExisting = 0;

    // Se inserta por lotes. Un unico createMany de 50.000 filas genera una
    // sentencia de varios MB y mantiene bloqueos de rango sobre el indice unico
    // de telefono durante toda la operacion.
    const TAMANO_LOTE = 2_000;

    for (let i = 0; i < toInsert.length; i += TAMANO_LOTE) {
      const lote = toInsert.slice(i, i + TAMANO_LOTE);

      // La dedup contra teléfonos ya existentes la hace la DB (índice único) con skipDuplicates,
      // sin cargar todos los contactos a memoria (escalable a millones).
      const res = await prisma.contacts.createMany({ data: lote, skipDuplicates: true });
      imported += res.count;

      // Auditoria del consentimiento: sin esto, `consent_events` quedaria vacia
      // para los contactos importados y no habria forma de demostrar el opt-in.
      if (consentimiento.otorgado && res.count > 0) {
        const insertados = await prisma.contacts.findMany({
          // `createdAt` identifica con precision las filas de ESTA importacion:
          // las que ya existian tienen otra marca de tiempo.
          where: { phone: { in: lote.map((c) => c.phone) }, createdAt: importadoEn },
          select: { id: true },
        });

        if (insertados.length > 0) {
          await prisma.consentEvents.createMany({
            data: insertados.map((c) => ({
              contactId: c.id,
              event: "opt_in",
              source: "import",
              raw: consentimiento.evidencia,
              createdBy: actor,
            })),
          });
        }
      }
    }

    dupExisting = toInsert.length - imported; // ya existían en la DB
    if (toInsert.length > 0) {
      await redis.del(CONTACTS_CACHE_KEY).catch(() => {});
    }

    const skipped = errors.length + dupExisting;
    return HttpResponse.sendSuccess(
      {
        Data: {
          imported,
          skipped,
          dupExisting,
          consentState: consentimiento.otorgado ? "opted_in" : "unknown",
          errors: errors.slice(0, 50),
        },
        Total: rows.length,
      },
      `Importados ${imported} de ${rows.length} (${skipped} omitido(s), ${dupExisting} ya existían)` +
        (consentimiento.otorgado
          ? " · Registrados con opt-in y su evidencia."
          : " · SIN consentimiento: no se les podrá enviar hasta registrar el opt-in.")
    );
  } catch (error) {
    return HttpResponse.sendServerError("Error al importar contactos", error);
  }
}
