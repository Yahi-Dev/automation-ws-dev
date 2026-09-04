// src/lib/mailer.ts
// Envío de correo transaccional (verificación de cuenta, restablecimiento de
// contraseña). Un solo transporter con pool para todo el proceso.
import nodemailer from "nodemailer";
import type SMTPPool from "nodemailer/lib/smtp-pool";

interface EmailOptions {
  to: string;
  subject: string;
  text?: string;
  html?: string;
}

const VARIABLES_REQUERIDAS = ["MAIL_HOST", "MAIL_PORT", "MAIL_FROM_ADDRESS"] as const;

let transporter: nodemailer.Transporter | null = null;

function construirTransporter(): nodemailer.Transporter {
  for (const variable of VARIABLES_REQUERIDAS) {
    if (!process.env[variable]) {
      throw new Error(`Falta la variable de entorno obligatoria: ${variable}`);
    }
  }

  const port = Number.parseInt(process.env.MAIL_PORT as string, 10);
  const usuario = process.env.MAIL_USERNAME;
  const password = process.env.MAIL_PASSWORD;

  // `rejectUnauthorized: false` estaba puesto de forma INCONDICIONAL, es decir
  // para todos los envíos, incluidos los enlaces de restablecimiento de
  // contraseña: cualquiera capaz de interponerse podía presentar un certificado
  // propio y leerlos. Ahora solo se relaja si se declara explícitamente, algo
  // que únicamente tiene sentido con un SMTP local de desarrollo.
  const permitirCertificadoPropio = process.env.MAIL_ALLOW_SELF_SIGNED === "true";

  const config: SMTPPool.Options = {
    host: process.env.MAIL_HOST,
    port,
    secure: port === 465,
    // Sin credenciales (SMTP local de desarrollo) no se envía bloque `auth`.
    ...(usuario && password && password !== "null"
      ? { auth: { user: usuario, pass: password } }
      : {}),
    ...(permitirCertificadoPropio ? { tls: { rejectUnauthorized: false } } : {}),

    // Ninguna de estas llamadas tenía timeout: con un SMTP que aceptase la
    // conexión y no respondiera, el envío se quedaba colgado varios minutos
    // reteniendo el handler que lo esperaba.
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 20_000,

    // Antes se creaba un transporter (y por tanto una conexión SMTP + TLS nueva)
    // en CADA correo. Con pool se reutiliza la conexión entre envíos.
    pool: true,
    maxConnections: 3,
    maxMessages: 100,
  };

  return nodemailer.createTransport(config);
}

function obtenerTransporter(): nodemailer.Transporter {
  if (!transporter) transporter = construirTransporter();
  return transporter;
}

export async function sendEmail({ to, subject, text, html }: EmailOptions) {
  try {
    const fromAddress = process.env.MAIL_FROM_NAME
      ? `${process.env.MAIL_FROM_NAME} <${process.env.MAIL_FROM_ADDRESS}>`
      : process.env.MAIL_FROM_ADDRESS;

    const info = await obtenerTransporter().sendMail({
      from: fromAddress,
      to,
      subject,
      ...(text && { text }),
      ...(html && { html }),
    });

    // Sin volcar destinatario ni asunto: son datos personales y acaban en los
    // logs del servidor y del recolector.
    console.log("Correo enviado", { messageId: info.messageId });

    return { success: true, messageId: info.messageId, info };
  } catch (error) {
    console.error("Fallo al enviar el correo", {
      error: error instanceof Error ? error.message : "Error desconocido",
    });

    throw new Error(
      `Email sending failed: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}
