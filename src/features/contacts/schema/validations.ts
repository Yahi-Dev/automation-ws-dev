import { z } from 'zod';

// Esquema de validación para contacts
export const contactSchema = z.object({
  name: z
    .string()
    .min(1, { message: 'El nombre es requerido' })
    .max(150, { message: 'El nombre no puede exceder los 150 caracteres' }),

  whatsapp: z.boolean().optional(),

  phone: z
    .string()
    .min(1, { message: 'El teléfono es requerido' })
    .max(20, { message: 'El teléfono no puede exceder los 20 caracteres' }),

  // País en formato ISO 3166-1 alpha-2 (ej: DO, US, MX)
  country: z
    .string()
    .length(2, { message: 'El país debe ser un código ISO de 2 letras' })
    .optional()
});

export type ContactFormValues = z.infer<typeof contactSchema>;

export const contactUpdateSchema = contactSchema.partial();

export const contactCreateSchema = contactSchema.required({
  name: true,
  phone: true
});