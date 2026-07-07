// src/app/api/upload/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import fs from 'fs';
import { storageEnabled, putObject } from '@/src/lib/storage';
import { requireAuth } from '@/src/lib/authz';

// Usa Node APIs (fs/path)
export const runtime = 'nodejs';
// Si este endpoint siempre debe ser dinámico (no caché)
export const dynamic = 'force-dynamic';

const MAX_BYTES = 5 * 1024 * 1024;

// Tipos de imagen permitidos -> extensión canónica del lado servidor.
// SVG queda EXCLUIDO a propósito: es un documento activo (XSS via <script>/onload).
const TYPE_TO_EXT: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/gif': '.gif',
};

function sanitizeSegment(input: string): string {
  return input.replace(/[^a-zA-Z0-9-_]/g, '').slice(0, 64) || 'general';
}

/**
 * Detecta el tipo real por "magic bytes" (no confía en file.type del cliente,
 * que es falsificable). Devuelve el MIME canónico o null si no es una imagen permitida.
 */
function sniffImageType(buf: Buffer): string | null {
  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'image/jpeg';
  if (
    buf.length >= 8 &&
    buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47 &&
    buf[4] === 0x0d && buf[5] === 0x0a && buf[6] === 0x1a && buf[7] === 0x0a
  ) return 'image/png';
  if (buf.length >= 4 && buf[0] === 0x47 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x38) return 'image/gif';
  if (
    buf.length >= 12 &&
    buf.toString('ascii', 0, 4) === 'RIFF' &&
    buf.toString('ascii', 8, 12) === 'WEBP'
  ) return 'image/webp';
  return null;
}

export async function POST(req: NextRequest) {
  try {
    const gate = await requireAuth(req);
    if ('response' in gate) return gate.response;

    const formData = await req.formData();
    const file = formData.get('file') as unknown as File | null;
    const rawFolder = (formData.get('folder') as string) || 'general';
    const folder = sanitizeSegment(rawFolder);

    if (!file) {
      return NextResponse.json({ message: 'No se proporcionó ningún archivo' }, { status: 400 });
    }

    if (file.size > MAX_BYTES) {
      return NextResponse.json({ message: 'La imagen no puede ser mayor a 5MB' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    if (buffer.length > MAX_BYTES) {
      return NextResponse.json({ message: 'La imagen no puede ser mayor a 5MB' }, { status: 400 });
    }

    // Validación por contenido real (magic bytes), NO por el header del cliente.
    const detected = sniffImageType(buffer);
    if (!detected || !TYPE_TO_EXT[detected]) {
      return NextResponse.json(
        { message: 'Solo se permiten imágenes JPG, PNG, WEBP o GIF' },
        { status: 400 }
      );
    }

    // Extensión canónica derivada del tipo detectado (nunca del nombre del cliente).
    const ext = TYPE_TO_EXT[detected];
    const uniqueName = `${uuidv4()}${ext}`;

    // Object storage (S3/R2) si está configurado: funciona multi-instancia.
    if (storageEnabled) {
      const key = `uploads/${folder}/${uniqueName}`;
      const imageUrl = await putObject(key, buffer, detected);
      return NextResponse.json({ imageUrl }, { status: 200 });
    }

    // Fallback: disco local (mono-instancia / dev).
    const uploadPath = path.join(process.cwd(), 'public', 'uploads', folder);
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    const filePath = path.join(uploadPath, uniqueName);
    await fs.promises.writeFile(filePath, buffer);

    const imageUrl = `/uploads/${folder}/${uniqueName}`;
    return NextResponse.json({ imageUrl }, { status: 200 });
  } catch (error) {
    console.error('Error al subir el archivo:', error);
    const errorMessage = error instanceof Error ? error.message : 'Error al subir el archivo';
    return NextResponse.json({ message: errorMessage }, { status: 500 });
  }
}
