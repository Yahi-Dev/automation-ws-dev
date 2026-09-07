// lib/auth.ts
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { nextCookies } from "better-auth/next-js";
import prisma from "./prisma";
import redis from "./redis";
import { sendEmail } from "./mailer";
import { consumirMarcaInvitacion, guardarEnlace, tomarEnlace } from "./invitaciones";
import { invitationEmailTemplate, invitationEmailText, passwordUpdatedTemplate, passwordUpdatedText, resetPasswordTemplate, resetPasswordText, verificationEmailTemplate, verificationEmailText } from "@/src/utils/email-templates";


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
      // El correo de INVITACION y el de RESTABLECER contrasena usan el mismo
      // mecanismo de better-auth (token que caduca y de un solo uso); lo unico
      // que cambia es el texto. Se distinguen aqui porque better-auth genera el
      // enlace por dentro y este es el unico punto donde se ve.
      //
      // Quien invita lo DECLARA (`marcarInvitacion`) justo antes de pedir el
      // enlace; aqui se consume esa marca. No se deduce del estado de la
      // cuenta: `temporaryPassword` nace en `true` y `lastLogin` no lo escribe
      // nadie, asi que cualquier usuario antiguo que pulsara "olvide mi
      // contrasena" habria recibido el correo de invitacion.
      // Sin marca = restablecimiento normal.
      const esInvitacion = consumirMarcaInvitacion(user.email);

      if (esInvitacion) {
        // Se guarda ANTES de enviar. Si el envio falla, el enlace sigue en el
        // almacen efimero y el endpoint que invito puede devolverselo al
        // administrador para que lo comparta a mano (hoy no hay SMTP).
        guardarEnlace(user.email, url);

        await sendEmail({
          to: user.email,
          subject: "Te han invitado a Automation WS",
          html: invitationEmailTemplate({
            link: url,
            userName: user?.name ?? "Cliente",
            appName: "Automation WS",
            logoUrl: logoUrl,
            supportEmail: "soporte@tu-dominio.com",
          }),
          text: invitationEmailText({ link: url, appName: "Automation WS", userName: user?.name ?? "Cliente" }),
        });

        // El correo salio: el enlace ya no hace falta en memoria. Su AUSENCIA
        // es justo lo que le dice al endpoint que no hace falta ensenarlo.
        tomarEnlace(user.email);
        return;
      }

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
      // La contrasena ya es SUYA: deja de ser provisional. Es lo que mira el
      // endpoint de reenvio para no volver a invitar a quien ya estreno la
      // cuenta, y lo que hace que la tabla deje de ofrecer «Reenviar
      // invitacion» para esa persona.
      await prisma.user
        .update({ where: { email: user.email }, data: { temporaryPassword: false } })
        .catch(() => null);

      const html = passwordUpdatedTemplate({
        userName: user?.name ?? "Cliente",
        appName: "Automation WS",
        logoUrl: logoUrl,
        supportEmail: "soporte@tu-dominio.com",
      });

      // El aviso de cortesia NO puede tumbar el cambio de contrasena.
      // better-auth invoca este callback DESPUES de guardar la contrasena y de
      // consumir el token, y sin protegerlo: si `sendEmail` lanza (hoy, sin SMTP
      // configurado, lanza siempre) el endpoint responde error, la persona lee
      // "no se pudo crear la contrasena" y vuelve a intentarlo con un enlace que
      // ya esta gastado. Es decir: la contrasena estaba puesta y la dejabamos
      // fuera igualmente. Se registra el fallo y se sigue.
      await sendEmail({
        to: user.email,
        subject: "Contraseña actualizada",
        html,
        text: passwordUpdatedText({ appName: "Automation WS" }),
      }).catch((error: unknown) => {
        console.error("No se pudo enviar el aviso de contraseña actualizada", {
          error: error instanceof Error ? error.message : "Error desconocido",
        });
      });
    },
  },
  plugins: [nextCookies()],
});



