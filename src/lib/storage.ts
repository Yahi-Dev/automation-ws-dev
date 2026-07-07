// src/lib/storage.ts
// Almacenamiento de objetos (S3 / Cloudflare R2) para uploads multi-instancia.
// GATED por env: si el bucket no está configurado, el caller cae a disco local
// (comportamiento previo), así el entorno de dev sigue funcionando sin bucket.
//
// Variables:
//   S3_BUCKET             (requerida)
//   S3_ACCESS_KEY_ID      (requerida)
//   S3_SECRET_ACCESS_KEY  (requerida)
//   S3_REGION             (por defecto "auto"; en AWS usa la región real)
//   S3_ENDPOINT           (R2/compatibles: https://<accountid>.r2.cloudflarestorage.com)
//   S3_PUBLIC_BASE_URL    (base pública para servir el objeto; ej. bucket público o CDN)
//   S3_FORCE_PATH_STYLE   ("true" para endpoints que lo requieran)
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

const BUCKET = process.env.S3_BUCKET || "";
const ACCESS_KEY = process.env.S3_ACCESS_KEY_ID || "";
const SECRET_KEY = process.env.S3_SECRET_ACCESS_KEY || "";
const REGION = process.env.S3_REGION || "auto";
const ENDPOINT = process.env.S3_ENDPOINT || undefined;
const PUBLIC_BASE = (process.env.S3_PUBLIC_BASE_URL || "").replace(/\/$/, "");
const FORCE_PATH_STYLE = process.env.S3_FORCE_PATH_STYLE === "true";

export const storageEnabled = Boolean(BUCKET && ACCESS_KEY && SECRET_KEY);

let client: S3Client | null = null;
function getClient(): S3Client | null {
  if (!storageEnabled) return null;
  if (!client) {
    client = new S3Client({
      region: REGION,
      endpoint: ENDPOINT,
      forcePathStyle: FORCE_PATH_STYLE,
      credentials: { accessKeyId: ACCESS_KEY, secretAccessKey: SECRET_KEY },
    });
  }
  return client;
}

/** URL pública para servir un objeto ya subido. */
export function publicUrlFor(key: string): string {
  if (PUBLIC_BASE) return `${PUBLIC_BASE}/${key}`;
  if (ENDPOINT) return `${ENDPOINT.replace(/\/$/, "")}/${BUCKET}/${key}`;
  return `https://${BUCKET}.s3.${REGION}.amazonaws.com/${key}`;
}

/** Sube un objeto y devuelve su URL pública. Lanza si el almacenamiento no está habilitado. */
export async function putObject(key: string, body: Buffer, contentType: string): Promise<string> {
  const c = getClient();
  if (!c) throw new Error("Object storage no configurado");
  await c.send(
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      Body: body,
      ContentType: contentType,
      CacheControl: "public, max-age=31536000, immutable",
    })
  );
  return publicUrlFor(key);
}
