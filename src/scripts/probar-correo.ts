// src/scripts/probar-correo.ts
//
// Comprueba que el envio de correo funciona de verdad.
//
// Sin correo NO funcionan ni las invitaciones de usuario ni el "olvide mi
// contrasena", asi que conviene poder verificarlo en un segundo en vez de
// descubrirlo cuando una persona real se queda fuera.
//
//   npm run probar:correo
//   npm run probar:correo -- otra@direccion.com
import { loadEnvConfig } from "@next/env";
loadEnvConfig(process.cwd());

import { sendEmail } from "../lib/mailer";

function diagnostico(mensaje: string): string {
  if (/Invalid login|BadCredentials|535/i.test(mensaje)) {
    return (
      "Google rechazo el usuario o la contrasena.\n" +
      "  - Con Gmail hay que usar una CONTRASENA DE APLICACION de 16 caracteres,\n" +
      "    no la contrasena normal de la cuenta. Se crea en:\n" +
      "    https://myaccount.google.com/apppasswords\n" +
      "  - Requiere tener activada la verificacion en dos pasos.\n" +
      "  - Copiala completa: son 16 caracteres, se muestran en 4 grupos de 4."
    );
  }
  if (/ETIMEDOUT|ECONNREFUSED|ENOTFOUND/i.test(mensaje)) {
    return "No se pudo conectar con el servidor de correo. Revisa MAIL_HOST y MAIL_PORT.";
  }
  if (/self.signed|certificate/i.test(mensaje)) {
    return "Problema con el certificado TLS del servidor de correo.";
  }
  return "Revisa las variables MAIL_* del entorno.";
}

async function main() {
  const destino = process.argv[2] || process.env.MAIL_USERNAME;

  if (!destino) {
    console.error("No hay destinatario. Define MAIL_USERNAME o pasa un correo como argumento.");
    process.exit(1);
  }

  const clave = process.env.MAIL_PASSWORD ?? "";
  console.log("Servidor:  " + process.env.MAIL_HOST + ":" + process.env.MAIL_PORT);
  console.log("Usuario:   " + process.env.MAIL_USERNAME);
  console.log("Clave:     " + clave.length + " caracteres");

  // Aviso temprano del error mas comun con Gmail.
  if (process.env.MAIL_HOST === "smtp.gmail.com" && clave.replace(/\s/g, "").length !== 16) {
    console.warn(
      "\n  AVISO: una contrasena de aplicacion de Gmail tiene exactamente 16 caracteres.\n" +
        "  La configurada tiene " + clave.replace(/\s/g, "").length + ". Probablemente falte algun caracter al copiarla.\n"
    );
  }

  console.log("\nEnviando a " + destino + " ...");

  try {
    const r = await sendEmail({
      to: destino,
      subject: "Prueba de correo — Automation WS",
      text: "Si lees esto, el envio de correos funciona.",
      html:
        "<p>Si lees esto, el envio de correos <strong>funciona</strong>.</p>" +
        "<p>Las invitaciones de usuario y el «olvide mi contrasena» ya pueden salir.</p>",
    });
    console.log("\nENVIADO. Revisa la bandeja (y la carpeta de spam). id: " + r.messageId);
  } catch (e) {
    const mensaje = e instanceof Error ? e.message : String(e);
    console.error("\nNO SE PUDO ENVIAR:\n  " + mensaje);
    console.error("\nQue suele ser:\n  " + diagnostico(mensaje));
    process.exitCode = 1;
  }
}

void main();
