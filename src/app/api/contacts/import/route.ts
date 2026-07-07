// src/app/api/contacts/import/route.ts
// Importa contactos desde un archivo CSV (columnas: nombre, telefono, pais).
// Valida y normaliza cada teléfono a E.164 con libphonenumber-js y omite duplicados.
import { NextRequest } from "next/server";
import Papa from "papaparse";
import { parsePhoneNumberFromString, type CountryCode } from "libphonenumber-js";
import { requireAuth } from "@/src/lib/authz";
import prisma from "@/src/lib/prisma";
import { redis } from "@/src/lib/redis";
import { HttpResponse } from "@/src/utils/httpResponse";

export const runtime = "nodejs";

const CONTACTS_CACHE_KEY = "contacts-cache";

/** Toma el valor de la primera columna cuyo encabezado coincida (case-insensitive). */
function pick(row: Record<string, string>, keys: string[]): string {
  for (const k of Object.keys(row)) {
    if (keys.includes(k.trim().toLowerCase())) return (row[k] ?? "").trim();
  }
  return "";
}

export async function POST(req: NextRequest) {
  try {
    const gate = await requireAuth(req);
    if ("response" in gate) return gate.response;

    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File)) return HttpResponse.sendBadRequest("Archivo requerido");

    const text = await file.text();
    const parsed = Papa.parse<Record<string, string>>(text, {
      header: true,
      skipEmptyLines: true,
    });
    const rows = parsed.data ?? [];
    if (rows.length === 0) {
      return HttpResponse.sendBadRequest("El archivo no tiene filas válidas");
    }

    const actor = gate.user.email ?? "system";
    const errors: Array<{ row: number; error: string }> = [];
    const seenPhones = new Set<string>();
    const toInsert: {
      name: string;
      phone: string;
      country: string | null;
      consentSource: string;
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

      toInsert.push({
        name: name.slice(0, 150),
        phone: e164,
        country: rawCountry || pn.country || null,
        consentSource: "import",
        createdBy: actor,
        createdAt: new Date(),
      });
    });

    let imported = 0;
    let dupExisting = 0;
    if (toInsert.length > 0) {
      // La dedup contra teléfonos ya existentes la hace la DB (índice único) con skipDuplicates,
      // sin cargar todos los contactos a memoria (escalable a millones).
      const res = await prisma.contacts.createMany({ data: toInsert, skipDuplicates: true });
      imported = res.count;
      dupExisting = toInsert.length - imported; // ya existían en la DB
      await redis.del(CONTACTS_CACHE_KEY).catch(() => {});
    }

    const skipped = errors.length + dupExisting;
    return HttpResponse.sendSuccess(
      { Data: { imported, skipped, dupExisting, errors: errors.slice(0, 50) }, Total: rows.length },
      `Importados ${imported} de ${rows.length} (${skipped} omitido(s), ${dupExisting} ya existían)`
    );
  } catch (error) {
    return HttpResponse.sendServerError("Error al importar contactos", error);
  }
}
