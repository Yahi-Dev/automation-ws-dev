// src/app/api/upload/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import fs from 'fs';
import { storageEnabled, putObject } from '@/src/lib/storage';

// Usa Node APIs (fs/path)
export const runtime = 'nodejs';
// Si este endpoint siempre debe ser dinámico (no caché)
export const dynamic = 'force-dynamic';

const ALLOWED_MIME = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/svg+xml',
]);

function sanitizeSegment(input: string): string {
  return input.replace(/[^a-zA-Z0-9-_]/g, '').slice(0, 64) || 'general';
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as unknown as File | null;
    const rawFolder = (formData.get('folder') as string) || 'general';
    const folder = sanitizeSegment(rawFolder);

    if (!file) {
      return NextResponse.json(
        { message: 'No se proporcionó ningún archivo' },
        { status: 400 }
      );
    }

    const type = file.type || '';
    if (!type.startsWith('image/') || !ALLOWED_MIME.has(type)) {
      return NextResponse.json(
        { message: 'Solo se permiten archivos de imagen' },
        { status: 400 }
      );
    }

    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json(
        { message: 'La imagen no puede ser mayor a 5MB' },
        { status: 400 }
      );
    }

    const fileExtension = path.extname(file.name);
    const uniqueName = `${uuidv4()}${fileExtension}`;
    const buffer = Buffer.from(await file.arrayBuffer());

    // Object storage (S3/R2) si está configurado: funciona multi-instancia.
    if (storageEnabled) {
      const key = `uploads/${folder}/${uniqueName}`;
      const imageUrl = await putObject(key, buffer, type || 'application/octet-stream');
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
    return NextResponse.json(
      { message: errorMessage },
      { status: 500 }
    );
  }
}