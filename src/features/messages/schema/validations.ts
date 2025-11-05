// src/features/messages/schema/validations.ts
import { z } from 'zod';

export const messageCreateSchema = z.object({
  postId: z.number().min(1, 'El post es requerido'),
  contactIds: z.array(z.number().min(1)).min(1, 'Al menos un contacto es requerido'),
});

export const messageUpdateSchema = z.object({
  status: z.enum(['pending', 'sent', 'failed', 'delivered']).optional(),
  sentAt: z.string().datetime().optional(),
});

export type MessageFormValues = z.infer<typeof messageCreateSchema>;
export type MessageUpdateValues = z.infer<typeof messageUpdateSchema>;