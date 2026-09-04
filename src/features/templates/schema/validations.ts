// src/features/templates/schema/validations.ts
//
// Validacion del cuerpo con el que se crean plantillas en la Content API de Twilio.
//
// Antes la unica comprobacion era `typeof input.types === "object"`, y todo el
// arbol viajaba tal cual a Twilio con las credenciales de la cuenta. Un usuario
// aprobado podia crear una plantilla `twilio/media` apuntando a cualquier URL:
// phishing enviado desde el remitente de WhatsApp verificado de la empresa.
import { z } from "zod";

/**
 * URL de medio permitida.
 *
 * Solo https, y solo del propio almacenamiento de la aplicacion cuando este
 * configurado (S3_PUBLIC_BASE_URL). Si no hay bucket publico definido, no se
 * admite ningun medio externo: es preferible bloquear la funcion a permitir
 * que se referencie contenido arbitrario desde el remitente de la empresa.
 */
const mediaUrlSchema = z
  .string()
  .url("La URL del medio no es válida")
  .refine((valor) => {
    let u: URL;
    try {
      u = new URL(valor);
    } catch {
      return false;
    }
    if (u.protocol !== "https:") return false;

    const base = process.env.S3_PUBLIC_BASE_URL;
    if (!base) return false;

    try {
      return u.origin === new URL(base).origin;
    } catch {
      return false;
    }
  }, "Solo se admiten medios alojados en el almacenamiento de la aplicación");

const textoPlantilla = z.string().min(1).max(1600);

/**
 * Tipos de contenido admitidos. Es una lista blanca a proposito: cualquier tipo
 * nuevo de Twilio (card, call-to-action, quick-reply...) debe habilitarse aqui
 * de forma consciente, no colarse por ser un objeto valido.
 */
const typesSchema = z
  .object({
    "twilio/text": z.object({ body: textoPlantilla }).strict().optional(),
    "twilio/media": z
      .object({
        body: textoPlantilla.optional(),
        media: z.array(mediaUrlSchema).min(1).max(10),
      })
      .strict()
      .optional(),
  })
  .strict()
  .refine(
    (t) => Boolean(t["twilio/text"] || t["twilio/media"]),
    "Debe indicarse al menos un tipo de contenido admitido (twilio/text o twilio/media)"
  );

export const templateCreateSchema = z.object({
  // Twilio exige minusculas, digitos y guion bajo para el nombre.
  friendly_name: z
    .string()
    .min(1)
    .max(64)
    .regex(
      /^[a-z0-9_]+$/,
      "El nombre solo admite minúsculas, dígitos y guion bajo"
    )
    .default("mi_template"),
  language: z
    .string()
    .min(2)
    .max(16)
    .regex(/^[a-zA-Z]{2}(_[a-zA-Z]{2})?$/, "Código de idioma no válido")
    .default("es"),
  // Mapa de variables de la plantilla: { "1": "Cliente", "2": "Fecha" }.
  variables: z
    .record(z.string().regex(/^\d{1,2}$/), z.string().max(120))
    .default({ "1": "Cliente" }),
  types: typesSchema,
});

export type TemplateCreateInput = z.infer<typeof templateCreateSchema>;
