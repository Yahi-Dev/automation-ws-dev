// src/features/posts/schema/validations.ts
import { z } from 'zod';

// Esquema para imágenes
export const imageSchema = z.object({
  url: z.string()
    .max(500, "La URL de la imagen es demasiado larga")
    .min(1, "La URL de la imagen es requerida"),
});

// Esquema de validación para posts
export const postSchema = z.object({
  schedule: z
    .string()
    .min(1, { message: 'La fecha y hora son requeridas' }),

  text: z
    .string()
    .min(1, { message: 'El texto es requerido' })
    .max(800, { message: 'El texto no puede exceder los 800 caracteres' }),

    contentTemplateId: z
    .string()
    .optional(),

  images: z.array(imageSchema).optional().default([])
});

export type PostFormValues = z.infer<typeof postSchema>;
export type ImageFormValues = z.infer<typeof imageSchema>;

export const postUpdateSchema = postSchema.partial();
export const postCreateSchema = postSchema.required({
  schedule: true,
  text: true
});