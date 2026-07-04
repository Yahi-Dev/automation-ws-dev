// lib/auth.ts
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { nextCookies } from "better-auth/next-js";
import prisma from "./prisma";
import { sendEmail } from "./mailer";
import { passwordUpdatedTemplate, passwordUpdatedText, resetPasswordTemplate, resetPasswordText, verificationEmailTemplate, verificationEmailText } from "@/src/utils/email-templates";


const logoUrl = process.env.NEXT_PUBLIC_APP_URL_LOGO;

export const auth = betterAuth({
  database: prismaAdapter(prisma, { provider: "mysql" }),
  baseURL: process.env.BETTER_AUTH_URL,

  user: {
    additionalFields: {
      phone: { type: "string", input: true },
      image: { type: "string", input: true },
      created_by: { type: "string", input: false, defaultValue: "system" },
      updated_by: { type: "string", input: false },
      is_deleted: { type: "boolean", input: false, defaultValue: false },
      emailVerified: { type: "boolean", input: false, defaultValue: false },
      temporaryPassword: { type: "boolean", input: false, defaultValue: true },
      isNew: { type: "boolean", input: false, defaultValue: true },
      status: { type: "string", input: false, defaultValue: "pending" },
      role: { type: "string", input: false, defaultValue: "user" },
    },
  },

  emailVerification: {
    sendOnSignUp: false, // Desactiva porque manejas la verificación manualmente
    autoSignInAfterVerification: true,

    sendVerificationEmail: async ({ user, token }) => {
      const link = `${process.env.NEXT_PUBLIC_APP_URL}/verify-and-set-password?token=${token}&email=${encodeURIComponent(user.email)}`;

      const html = verificationEmailTemplate({
        userName: user?.name ?? "Cliente",
        appName: "Automation WS",
        link,
        logoUrl: logoUrl,
        supportEmail: "soporte@tu-dominio.com",
      });

      await sendEmail({
        to: user.email,
        subject: "Verifica tu correo y crea tu contraseña",
        html,
        text: verificationEmailText({ appName: "Automation WS", link }),
      });
    },
  },

  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false, // Desactiva porque manejas la verificación manualmente

    sendResetPassword: async ({ user, url }) => {
      const html = resetPasswordTemplate({
        url,
        userName: user?.name ?? "Cliente",
        appName: "Automation WS",
        logoUrl: logoUrl,
        supportEmail: "soporte@tu-dominio.com",
      });

      await sendEmail({
        to: user.email,
        subject: "Restablece tu contraseña",
        html,
        text: resetPasswordText({ url, appName: "Automation WS" }),
      });
    },
    onPasswordReset: async ({ user }) => {
      const html = passwordUpdatedTemplate({
        userName: user?.name ?? "Cliente",
        appName: "Automation WS",
        logoUrl: logoUrl,
        supportEmail: "soporte@tu-dominio.com",
      });

      await sendEmail({
        to: user.email,
        subject: "Contraseña actualizada",
        html,
        text: passwordUpdatedText({ appName: "Automation WS" }),
      });
    },
  },
  plugins: [nextCookies()],
});



