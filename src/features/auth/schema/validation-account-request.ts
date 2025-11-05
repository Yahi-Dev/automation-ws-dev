// validation/account-request.schema.ts
import { z } from "zod"

export const accountRequestSchema = z
  .object({
    firstName: z.string().trim().min(1, "Este campo es requerido").max(40, "Máximo 40 caracteres"),
    lastName: z.string().trim().min(1, "Este campo es requerido").max(40, "Máximo 40 caracteres"),
    title: z.string().trim().min(1, "Este campo es requerido").max(60, "Máximo 60 caracteres"),

    companyName: z.string().trim().min(1, "Este campo es requerido").max(80, "Máximo 80 caracteres"),
    city: z.string().trim().min(1, "Este campo es requerido").max(60, "Máximo 60 caracteres"),
    customerAccountNumber: z.string().trim().min(1, "Este campo es requerido").max(40, "Máximo 40 caracteres"),

    companyPhoneNumber: z
      .string()
      .trim()
      .min(1, "Este campo es requerido")
      .refine((v) => /^[\d\s+\-()]{10,20}$/.test(v), {
        message: "Número de teléfono inválido",
      }),

    emailAddress: z
      .string()
      .trim()
      .min(1, "Este campo es requerido")
      .max(40, "Máximo 40 caracteres")
      .email("Correo electrónico inválido"),

    confirmEmailAddress: z.string().trim().min(1, "Este campo es requerido").max(40, "Máximo 40 caracteres"),

    contactPerson: z.string().trim().min(1, "Este campo es requerido").max(80, "Máximo 80 caracteres"),

    // Opcionales
    contactPhone: z
      .string()
      .trim()
      .optional()
      .refine((v) => !v || /^[\d\s+\-()]{10,20}$/.test(v), {
        message: "Número de teléfono inválido",
      }),

    questionOrComment: z.string().trim().max(300, "Máximo 300 caracteres").optional(),
  })
  .superRefine((data, ctx) => {
    if (data.emailAddress !== data.confirmEmailAddress) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["confirmEmailAddress"],
        message: "Los correos electrónicos no coinciden",
      })
    }
  })

export type AccountRequestFormData = z.infer<typeof accountRequestSchema>