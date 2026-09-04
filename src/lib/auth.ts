// lib/auth.ts
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { nextCookies } from "better-auth/next-js";
import prisma from "./prisma";
import redis from "./redis";
import { sendEmail } from "./mailer";
import { passwordUpdatedTemplate, passwordUpdatedText, resetPasswordTemplate, resetPasswordText, verificationEmailTemplate, verificationEmailText } from "@/src/utils/email-templates";


const logoUrl = process.env.NEXT_PUBLIC_APP_URL_LOGO;

export const auth = betterAuth({
  database: prismaAdapter(prisma, { provider: "mysql" }),
  baseURL: process.env.BETTER_AUTH_URL,

  // Caché de sesiones en Redis (resiliente: cae a memoria por proceso si no hay Redis).
  // La DB sigue siendo la fuente de verdad (storeSessionInDatabase), así que en
  // multi-instancia las sesiones se resuelven aunque Redis esté caído; cuando está
  // disponible, evita ir a la DB en cada request (menos carga a escala).
  secondaryStorage: {
    get: async (key) => {
      const v = await redis.get<unknown>(`ba:${key}`);
      if (v === null || v === undefined) return null;
      return typeof v === "string" ? v : JSON.stringify(v);
    },
    set: async (key, value, ttl) => {
      await redis.set(`ba:${key}`, value, ttl ? { ex: ttl } : undefined);
    },
    delete: async (key) => {
      await redis.del(`ba:${key}`);
    },
  },

  session: {
    // Mantener la sesión también en la DB: fuente de verdad + resiliencia del fallback.
    storeSessionInDatabase: true,
  },

  // Rate-limit nativo de better-auth para TODOS los endpoints de auth (login, signup,
  // forgot/reset password, verify). Usa secondaryStorage (Redis) -> contador compartido
  // entre instancias (no per-proceso). Complementa al middleware de login.
  rateLimit: {
    enabled: true,
    window: 60, // segundos
    max: 30, // peticiones por ventana por IP
    storage: "secondary-storage",
    customRules: {
      "/sign-in/email": { window: 60, max: 10 },
      "/sign-up/email": { window: 60, max: 5 },
      // El endpoint real de esta version es "/request-password-reset". La regla
      // anterior apuntaba a "/forget-password", que no existe: las peticiones de
      // recuperacion caian en el limite generico (30/min) en vez de en 5/hora.
      "/request-password-reset": { window: 3600, max: 5 },
      "/reset-password": { window: 3600, max: 10 },
    },
  },

  advanced: {
    // Que cabeceras acepta better-auth para resolver la IP del cliente.
    // Por defecto recorre una lista amplia, y con `trustedProxies` sin definir
    // acepta cualquier cabecera de valor unico: eso permitia rotar la IP en cada
    // intento y saltarse el rate-limit nativo, igual que ocurria en el middleware.
    //
    // Se mantiene alineado con src/lib/client-ip.ts: solo se confia en las
    // cabeceras de plataforma cuando el entorno declara que hay un proxy delante.
    ipAddress: {
      ipAddressHeaders:
        process.env.TRUST_PLATFORM_HEADERS === "true"
          ? ["cf-connecting-ip", "x-real-ip", "x-forwarded-for"]
          : ["x-forwarded-for"],
      // IPs o rangos CIDR de los proxies propios, separados por coma.
      // Sin esto, la cadena x-forwarded-for no se puede interpretar con garantias.
      trustedProxies: (process.env.TRUSTED_PROXY_IPS ?? "")
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
    },
  },

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



