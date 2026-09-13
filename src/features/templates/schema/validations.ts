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
 * ¿La URL apunta al almacenamiento de ESTA aplicacion?
 *
 * La lista blanca no es burocracia: sin ella, cualquier usuario aprobado podia
 * crear una plantilla `twilio/media` apuntando a una URL cualquiera, y ese
 * contenido saldria desde el remitente de WhatsApp verificado de la empresa.
 * Es phishing con el sello de la empresa encima.
 *
 * Se admiten dos almacenamientos:
 *
 *  - Cloudinary, que es el que usa la app. Se exige ademas que la ruta empiece
 *    por el nombre de la cuenta propia: `res.cloudinary.com` lo comparten todas
 *    las cuentas del mundo, asi que comprobar solo el dominio dejaria pasar
 *    imagenes de cualquier otra.
 *  - S3, por si alguna vez se vuelve a el (S3_PUBLIC_BASE_URL).
 *
 * Si no hay ninguno configurado no se admite nada. Bloquear la funcion es
 * preferible a dejar la puerta abierta.
 */
function esMedioPropio(valor: string): boolean {
  let u: URL;
  try {
    u = new URL(valor);
  } catch {
    return false;
  }
  if (u.protocol !== "https:") return false;

  const cuentaCloudinary = process.env.CLOUDINARY_CLOUD_NAME;
  if (cuentaCloudinary && u.hostname === "res.cloudinary.com") {
    // La ruta es /<cuenta>/image/upload/... El primer tramo tiene que ser la
    // cuenta propia, no la de un tercero.
    return u.pathname.startsWith(`/${cuentaCloudinary}/`);
  }

  const base = process.env.S3_PUBLIC_BASE_URL;
  if (base) {
    try {
      return u.origin === new URL(base).origin;
    } catch {
      return false;
    }
  }

  return false;
}

const mediaUrlSchema = z
  .string()
  .url("La URL del medio no es válida")
  .refine(
    esMedioPropio,
    "Solo se admiten imágenes subidas desde la propia aplicación"
  );

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

  /**
   * Mandar la plantilla a revisión de WhatsApp nada más crearla.
   *
   * Lo usa el guardado de campañas. Sin esto, la plantilla se quedaba en
   * "recibida" para siempre y la campaña no podía enviarse nunca a nadie que no
   * hubiera escrito antes — que es el 100% de una difusión.
   *
   * La pantalla de Plantillas NO lo usa: allí se manda a revisar a mano, porque
   * quien la usa elige la categoría y el nombre a conciencia.
   */
  submit_for_approval: z.boolean().default(false),

  /**
   * Categoría con la que se pide la revisión.
   *
   * Importa: mandar contenido promocional como UTILITY infringe las normas de
   * Meta, y lo que se ahorra se paga con rechazos y con la calificación del
   * número. Las campañas de esta app son promocionales.
   */
  approval_category: z
    .enum(["MARKETING", "UTILITY", "AUTHENTICATION"])
    .default("MARKETING"),
});

export type TemplateCreateInput = z.infer<typeof templateCreateSchema>;
