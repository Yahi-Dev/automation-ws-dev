// src/lib/cloudinary.ts
//
// Subida de imágenes a Cloudinary.
//
// Por qué existe: la app se despliega en Vercel, donde el sistema de archivos
// es de SOLO LECTURA. El respaldo a `public/uploads/` funciona en local pero en
// producción lanza `EROFS` y la persona ve un error 500 al subir una imagen.
//
// Se habla con la API REST directamente en vez de con el SDK oficial: la firma
// es un SHA-1 de cuatro líneas, y así no se añade una dependencia más ni se
// depende de que el SDK se comporte bien en un entorno serverless.
//
// Variables:
//   CLOUDINARY_CLOUD_NAME   (requerida)
//   CLOUDINARY_API_KEY      (requerida)
//   CLOUDINARY_API_SECRET   (requerida)
//   CLOUDINARY_FOLDER       (opcional, por defecto "automation-ws")
import { createHash } from "node:crypto";

const CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME || "";
const API_KEY = process.env.CLOUDINARY_API_KEY || "";
const API_SECRET = process.env.CLOUDINARY_API_SECRET || "";
const CARPETA_BASE = process.env.CLOUDINARY_FOLDER || "automation-ws";

export const cloudinaryEnabled = Boolean(CLOUD_NAME && API_KEY && API_SECRET);

/** Tiempo máximo de la subida. Sin él, una respuesta que no cierra cuelga el handler. */
const TIMEOUT_MS = 20_000;

/**
 * Firma de Cloudinary: SHA-1 de los parámetros ordenados alfabéticamente,
 * unidos por `&`, con el api_secret pegado al final.
 *
 * El `api_key` y el `file` NO entran en la firma; el resto sí, y tienen que ir
 * en el formulario EXACTAMENTE con el mismo valor que se firmó, o Cloudinary
 * responde 401.
 */
function firmar(parametros: Record<string, string>): string {
  const cadena = Object.keys(parametros)
    .sort()
    .map((k) => `${k}=${parametros[k]}`)
    .join("&");

  return createHash("sha1").update(cadena + API_SECRET).digest("hex");
}

type RespuestaCloudinary = {
  secure_url?: string;
  public_id?: string;
  error?: { message?: string };
};

/**
 * Sube una imagen y devuelve su URL pública (https).
 *
 * @param nombre    Nombre del archivo, solo para derivar el `public_id`.
 * @param contenido Bytes de la imagen.
 * @param carpeta   Subcarpeta lógica dentro del espacio de la app (ej. "posts").
 */
export async function subirImagen(
  nombre: string,
  contenido: Buffer,
  carpeta: string
): Promise<string> {
  if (!cloudinaryEnabled) {
    throw new Error("Cloudinary no está configurado");
  }

  // Cloudinary firma con el segundo, no con el milisegundo.
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const folder = `${CARPETA_BASE}/${carpeta}`.replace(/\/+/g, "/");

  // `public_id` sin extensión: Cloudinary la añade según el tipo detectado.
  const publicId = nombre.replace(/\.[^.]+$/, "");

  const aFirmar = { folder, public_id: publicId, timestamp };
  const signature = firmar(aFirmar);

  const formulario = new FormData();
  formulario.append("file", new Blob([new Uint8Array(contenido)]), nombre);
  formulario.append("api_key", API_KEY);
  formulario.append("timestamp", timestamp);
  formulario.append("folder", folder);
  formulario.append("public_id", publicId);
  formulario.append("signature", signature);

  const respuesta = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`,
    { method: "POST", body: formulario, signal: AbortSignal.timeout(TIMEOUT_MS) }
  );

  const cuerpo = (await respuesta.json().catch(() => ({}))) as RespuestaCloudinary;

  if (!respuesta.ok || !cuerpo.secure_url) {
    // El mensaje de Cloudinary es útil para diagnosticar (firma inválida,
    // cuenta sin espacio) y no expone secretos.
    throw new Error(
      `Cloudinary rechazó la subida (${respuesta.status}): ${cuerpo.error?.message ?? "sin detalle"}`
    );
  }

  return cuerpo.secure_url;
}
