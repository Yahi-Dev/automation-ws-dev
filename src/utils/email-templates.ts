// utils/email-templates.ts


//Reset Password Email Template (HTML and Text)
export function resetPasswordTemplate({
  url,
  userName = "Cliente",
  appName = "Automatización WS",
  logoUrl,
  supportEmail = "soporte@tu-dominio.com",
}: {
  url: string;
  userName?: string;
  appName?: string;
  logoUrl?: string;
  supportEmail?: string;
}) {
  // Colores de tu marca
  const primary = "#16a34a";   // green-600
  const secondary = "#10b981"; // emerald-500
  const text = "#111827";      // gray-900
  const muted = "#6b7280";     // gray-500
  const bg = "#f8fafc";        // slate-50
  const card = "#ffffff";

  const preheader = `Restablece tu contraseña de ${appName}`;
  const safeLogo = logoUrl || `${process.env.NEXT_PUBLIC_APP_URL_LOGO}`;

  return `<!doctype html>
<html lang="es">
  <head>
    <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
    <meta name="color-scheme" content="light only" />
    <meta name="x-apple-disable-message-reformatting" />
    <meta name="format-detection" content="telephone=no, date=no, address=no, email=no" />
    <title>${appName} – Restablecer contraseña</title>
    <style>
      a { text-decoration: none; }
      @media (max-width: 600px) {
        .container { width: 100% !important; }
        .px { padding-left: 20px !important; padding-right: 20px !important; }
        .btn { width: 100% !important; }
      }
    </style>
  </head>
  <body style="margin:0; padding:0; background:${bg};">
    <!-- Preheader (oculto) -->
    <div style="display:none; max-height:0; overflow:hidden; opacity:0; color:transparent; visibility:hidden;">
      ${preheader} — Si no solicitaste este cambio, ignora este mensaje.
    </div>

    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background:${bg};">
      <tr>
        <td align="center" style="padding: 32px 16px;">
          <table role="presentation" cellpadding="0" cellspacing="0" width="600" class="container" style="width:600px; max-width:100%;">
            <!-- Card -->
            <tr>
              <td style="background:${card}; border-radius:16px; box-shadow:0 20px 60px rgba(0,0,0,.12); overflow:hidden;">
                <!-- Top bar gradient -->
                <div style="height:6px; background: linear-gradient(90deg, ${primary}, ${secondary});"></div>

                <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                  <tr>
                    <td align="center" class="px" style="padding: 32px 40px;">
                      <!-- Logo -->
                      <div style="display:inline-block; background:#fff; border-radius:16px; padding:16px; box-shadow:0 10px 25px rgba(0,0,0,.08);">
                        <img src="${safeLogo}" alt="${appName} Logo" width="114" height="114" style="display:block; border:0; outline:none; text-decoration:none;" />
                      </div>

                      <!-- Heading -->
                      <h1 style="margin:24px 0 8px; font-family:Segoe UI,Roboto,Arial,sans-serif; font-size:24px; line-height:1.3; color:${text};">
                        Restablece tu contraseña
                      </h1>
                      <div style="height:6px; width:96px; margin:8px auto 0; border-radius:9999px; background: linear-gradient(90deg, ${primary}, ${secondary});"></div>

                      <!-- Copy -->
                      <p style="margin:24px 0 0; font-family:Segoe UI,Roboto,Arial,sans-serif; font-size:14px; line-height:1.7; color:${muted};">
                        Hola <strong style="color:${text};">${userName}</strong>, recibimos una solicitud para restablecer la contraseña de tu cuenta en <strong style="color:${text};">${appName}</strong>.
                      </p>
                      <p style="margin:12px 0 0; font-family:Segoe UI,Roboto,Arial,sans-serif; font-size:14px; line-height:1.7; color:${muted};">
                        Haz clic en el botón para crear una nueva contraseña. Por seguridad, este enlace puede expirar.
                      </p>

                      <!-- Button (bulletproof) -->
                      <table role="presentation" cellpadding="0" cellspacing="0" style="margin:28px auto 0;">
                        <tr>
                          <td align="center" bgcolor="${primary}" style="border-radius:12px;">
                            <!--[if mso]>
                            <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" arcsize="20%" href="${url}" style="height:48px;v-text-anchor:middle;width:280px;" stroke="f" fillcolor="${primary}">
                              <w:anchorlock/>
                              <center style="color:#ffffff;font-family:Segoe UI,Roboto,Arial,sans-serif;font-size:16px;font-weight:bold;">
                                Restablecer contraseña →
                              </center>
                            </v:roundrect>
                            <![endif]-->
                            <![if !mso]>
                              <a class="btn" href="${url}" target="_blank"
                                style="display:inline-block; padding:14px 22px; min-width:240px; text-align:center; border-radius:12px; background: linear-gradient(90deg, ${primary}, ${secondary}); color:#fff; font-family:Segoe UI,Roboto,Arial,sans-serif; font-size:16px; font-weight:700;">
                                Restablecer contraseña →
                              </a>
                            <![endif]>
                          </td>
                        </tr>
                      </table>

                      <!-- Fallback URL -->
                      <p style="margin:24px 0 0; font-family:Segoe UI,Roboto,Arial,sans-serif; font-size:12px; line-height:1.7; color:${muted};">
                        Si el botón no funciona, copia y pega este enlace en tu navegador:
                      </p>
                      <p style="margin:8px 0 0; font-family:Segoe UI,Roboto,Arial,sans-serif; font-size:12px; word-break:break-all;">
                        <a href="${url}" style="color:${primary}; text-decoration:underline;">${url}</a>
                      </p>

                      <!-- Divider -->
                      <div style="height:1px; background:#e5e7eb; margin:28px 0;"></div>

                      <!-- Help / Footer -->
                      <p style="margin:0; font-family:Segoe UI,Roboto,Arial,sans-serif; font-size:12px; color:${muted};">
                        ¿No solicitaste este cambio? Puedes ignorar este correo. Si tienes dudas, contáctanos en
                        <a href="mailto:${supportEmail}" style="color:${primary}; text-decoration:underline;">${supportEmail}</a>.
                      </p>

                      <p style="margin:16px 0 0; font-family:Segoe UI,Roboto,Arial,sans-serif; font-size:12px; color:${muted};">
                        © ${new Date().getFullYear()} ${appName}. Todos los derechos reservados.
                      </p>
                    </td>
                  </tr>
                </table>

              </td>
            </tr>
          </table>

        </td>
      </tr>
    </table>
  </body>
</html>`;
}

export function resetPasswordText({
  url,
  appName = "Automation WS",
}: { url: string; appName?: string }) {
  return `Restablece tu contraseña de ${appName}

Hemos recibido una solicitud para restablecer tu contraseña.
Abre el siguiente enlace para continuar (puede expirar):

${url}

Si no solicitaste este cambio, ignora este mensaje.`;
}




// Password Updated Email Template (HTML and Text)
export function passwordUpdatedTemplate({
  userName = "Cliente",
  appName = "Automation WS",
  logoUrl,
  supportEmail = "soporte@tu-dominio.com",
}: {
  userName?: string;
  appName?: string;
  logoUrl?: string;
  supportEmail?: string;
}) {
  const primary = "#16a34a";   // green-600
  const secondary = "#10b981"; // emerald-500
  const text = "#111827";      // gray-900
  const muted = "#6b7280";     // gray-500
  const bg = "#f8fafc";        // slate-50
  const card = "#ffffff";

  const safeLogo = logoUrl || `${process.env.NEXT_PUBLIC_APP_URL_LOGO}`;

  return `<!doctype html>
<html lang="es">
  <head>
    <meta charset="UTF-8" />
    <title>${appName} – Contraseña actualizada</title>
    <style>
      @media (max-width:600px){ .container{width:100%!important;} }
    </style>
  </head>
  <body style="margin:0;padding:0;background:${bg};">
    <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
      <tr>
        <td align="center" style="padding:32px 16px;">
          <table role="presentation" cellpadding="0" cellspacing="0" width="600" class="container" style="max-width:100%;">
            <tr>
              <td style="background:${card};border-radius:16px;box-shadow:0 20px 60px rgba(0,0,0,.12);overflow:hidden;">
                <div style="height:6px;background:linear-gradient(90deg,${primary},${secondary});"></div>
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                  <tr>
                    <td align="center" style="padding:32px 40px;">
                      <div style="display:inline-block;background:#fff;border-radius:16px;padding:16px;box-shadow:0 10px 25px rgba(0,0,0,.08);">
                        <img src="${safeLogo}" alt="${appName} Logo" width="114" height="114" style="display:block;" />
                      </div>

                      <h1 style="margin:24px 0 8px;font-family:Segoe UI,Roboto,Arial,sans-serif;font-size:24px;color:${text};">
                        Contraseña actualizada
                      </h1>
                      <div style="height:6px;width:96px;margin:8px auto;border-radius:9999px;background:linear-gradient(90deg,${primary},${secondary});"></div>

                      <p style="margin:24px 0 0;font-family:Segoe UI,Roboto,Arial,sans-serif;font-size:14px;color:${muted};line-height:1.7;">
                        Hola <strong style="color:${text};">${userName}</strong>, tu contraseña en <strong>${appName}</strong> ha sido actualizada correctamente.
                      </p>
                      <p style="margin:12px 0 0;font-family:Segoe UI,Roboto,Arial,sans-serif;font-size:14px;color:${muted};line-height:1.7;">
                        Si tú no realizaste este cambio, te recomendamos <strong>restablecerla de inmediato</strong> y contactar a nuestro equipo de soporte.
                      </p>

                      <div style="height:1px;background:#e5e7eb;margin:28px 0;"></div>


                      <p style="margin:16px 0 0;font-family:Segoe UI,Roboto,Arial,sans-serif;font-size:12px;color:${muted};">
                        © ${new Date().getFullYear()} ${appName}. Todos los derechos reservados.
                      </p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

export function passwordUpdatedText({
  appName = "Automation WS",
}: { appName?: string }) {
  return `Tu contraseña en ${appName} ha sido actualizada correctamente.

Si no realizaste este cambio, restablece tu contraseña de inmediato y contacta a nuestro equipo de soporte.`;
}





// Verification Email Template (HTML and Text)
export function verificationEmailTemplate({
  userName = "Cliente",
  appName = "Automation WS",
  link,
  logoUrl,
  supportEmail = "soporte@tu-dominio.com",
}: {
  userName?: string;
  appName?: string;
  link: string;
  logoUrl?: string;
  supportEmail?: string;
}) {
  const primary = "#16a34a";   // green-600
  const secondary = "#10b981"; // emerald-500
  const text = "#111827";      // gray-900
  const muted = "#6b7280";     // gray-500
  const bg = "#f8fafc";        // slate-50
  const card = "#ffffff";

  const safeLogo = logoUrl || `${process.env.NEXT_PUBLIC_APP_URL_LOGO}`;

  return `<!doctype html>
<html lang="es">
  <head>
    <meta charset="UTF-8" />
    <title>${appName} – Verificación de correo</title>
    <style>
      @media (max-width:600px){ .container{width:100%!important;} }
    </style>
  </head>
  <body style="margin:0;padding:0;background:${bg};">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td align="center" style="padding:32px 16px;">
          <table role="presentation" width="600" class="container" style="max-width:100%;">
            <tr>
              <td style="background:${card};border-radius:16px;box-shadow:0 20px 60px rgba(0,0,0,.12);overflow:hidden;">
                <div style="height:6px;background:linear-gradient(90deg,${primary},${secondary});"></div>
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                  <tr>
                    <td align="center" style="padding:32px 40px;">
                      <div style="display:inline-block;background:#fff;border-radius:16px;padding:16px;box-shadow:0 10px 25px rgba(0,0,0,.08);">
                        <img src="${safeLogo}" alt="${appName} Logo" width="114" height="114" style="display:block;" />
                      </div>

                      <h1 style="margin:24px 0 8px;font-family:Segoe UI,Roboto,Arial,sans-serif;font-size:24px;color:${text};">
                        Bienvenido a ${appName}
                      </h1>
                      <div style="height:6px;width:96px;margin:8px auto;border-radius:9999px;background:linear-gradient(90deg,${primary},${secondary});"></div>

                      <p style="margin:24px 0 0;font-family:Segoe UI,Roboto,Arial,sans-serif;font-size:14px;color:${muted};line-height:1.7;">
                        Hola <strong style="color:${text};">${userName}</strong>, gracias por registrarte en <strong>${appName}</strong>.
                      </p>
                      <p style="margin:12px 0 0;font-family:Segoe UI,Roboto,Arial,sans-serif;font-size:14px;color:${muted};line-height:1.7;">
                        Para completar tu registro, confirma tu correo electrónico y crea tu contraseña usando el siguiente botón:
                      </p>

                      <!-- Botón -->
                      <table role="presentation" cellpadding="0" cellspacing="0" style="margin:28px auto 0;">
                        <tr>
                          <td align="center" bgcolor="${primary}" style="border-radius:12px;">
                            <!--[if mso]>
                            <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" arcsize="20%" href="${link}" style="height:48px;v-text-anchor:middle;width:300px;" stroke="f" fillcolor="${primary}">
                              <w:anchorlock/>
                              <center style="color:#ffffff;font-family:Segoe UI,Roboto,Arial,sans-serif;font-size:16px;font-weight:bold;">
                                Verificar y crear contraseña →
                              </center>
                            </v:roundrect>
                            <![endif]-->
                            <![if !mso]>
                              <a href="${link}" target="_blank"
                                style="display:inline-block;padding:14px 22px;min-width:260px;text-align:center;border-radius:12px;background:linear-gradient(90deg,${primary},${secondary});color:#fff;font-family:Segoe UI,Roboto,Arial,sans-serif;font-size:16px;font-weight:700;">
                                Verificar y crear contraseña →
                              </a>
                            <![endif]>
                          </td>
                        </tr>
                      </table>

                      <!-- Avisos -->
                      <p style="margin:24px 0 0;font-family:Segoe UI,Roboto,Arial,sans-serif;font-size:12px;color:${muted};line-height:1.7;">
                        Este enlace expirará en <strong>24 horas</strong>.
                      </p>
                      <p style="margin:8px 0 0;font-family:Segoe UI,Roboto,Arial,sans-serif;font-size:12px;color:${muted};line-height:1.7;">
                        Si no solicitaste esta cuenta, simplemente ignora este mensaje.
                      </p>

                      <div style="height:1px;background:#e5e7eb;margin:28px 0;"></div>

                      <p style="margin:16px 0 0;font-family:Segoe UI,Roboto,Arial,sans-serif;font-size:12px;color:${muted};">
                        © ${new Date().getFullYear()} ${appName}. Todos los derechos reservados.
                      </p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

export function verificationEmailText({
  appName = "Automation WS",
  link,
}: { appName?: string; link: string }) {
  return `Bienvenido a ${appName}

Para completar tu registro, confirma tu correo y crea tu contraseña con el siguiente enlace (expira en 24h):

${link}

Si no solicitaste esta cuenta, ignora este mensaje.`;
}






// Welcome Email Template (HTML and Text)
export function welcomeEmailTemplate({
  appUrl,
  userName = "Cliente",
  appName = "Automation WS",
  logoUrl,
  supportEmail = "soporte@tu-dominio.com",
}: {
  appUrl: string;
  userName?: string;
  appName?: string;
  logoUrl?: string;
  supportEmail?: string;
}) {
  const primary = "#16a34a";   // green-600
  const secondary = "#10b981"; // emerald-500
  const text = "#111827";      // gray-900
  const muted = "#6b7280";     // gray-500
  const bg = "#f8fafc";        // slate-50
  const card = "#ffffff";

  const safeLogo = logoUrl || `${process.env.NEXT_PUBLIC_APP_URL_LOGO}`;
  const preheader = `¡Bienvenido a ${appName}! Tu cuenta está lista.`;

  return `<!doctype html>
<html lang="es">
  <head>
    <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
    <meta name="color-scheme" content="light only" />
    <meta name="x-apple-disable-message-reformatting" />
    <meta name="format-detection" content="telephone=no, date=no, address=no, email=no" />
    <title>${appName} – Bienvenida</title>
    <style>
      a { text-decoration: none; }
      @media (max-width: 600px) {
        .container { width: 100% !important; }
        .px { padding-left: 20px !important; padding-right: 20px !important; }
        .btn { width: 100% !important; }
      }
    </style>
  </head>
  <body style="margin:0; padding:0; background:${bg};">
    <!-- Preheader (oculto) -->
    <div style="display:none; max-height:0; overflow:hidden; opacity:0; color:transparent; visibility:hidden;">
      ${preheader}
    </div>

    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background:${bg};">
      <tr>
        <td align="center" style="padding: 32px 16px;">
          <table role="presentation" cellpadding="0" cellspacing="0" width="600" class="container" style="width:600px; max-width:100%;">
            <!-- Card -->
            <tr>
              <td style="background:${card}; border-radius:16px; box-shadow:0 20px 60px rgba(0,0,0,.12); overflow:hidden;">
                <!-- Top bar gradient -->
                <div style="height:6px; background: linear-gradient(90deg, ${primary}, ${secondary});"></div>

                <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                  <tr>
                    <td align="center" class="px" style="padding: 32px 40px;">
                      <!-- Logo -->
                      <div style="display:inline-block; background:#fff; border-radius:16px; padding:16px; box-shadow:0 10px 25px rgba(0,0,0,.08);">
                        <img src="${safeLogo}" alt="${appName} Logo" width="114" height="114" style="display:block; border:0; outline:none; text-decoration:none;" />
                      </div>

                      <!-- Heading -->
                      <h1 style="margin:24px 0 8px; font-family:Segoe UI,Roboto,Arial,sans-serif; font-size:24px; line-height:1.3; color:${text};">
                        ¡Bienvenido(a) a ${appName}!
                      </h1>
                      <div style="height:6px; width:96px; margin:8px auto 0; border-radius:9999px; background: linear-gradient(90deg, ${primary}, ${secondary});"></div>

                      <!-- Copy -->
                      <p style="margin:24px 0 0; font-family:Segoe UI,Roboto,Arial,sans-serif; font-size:14px; line-height:1.7; color:${muted};">
                        Hola <strong style="color:${text};">${userName}</strong>, gracias por unirte a <strong style="color:${text};">${appName}</strong>. Tu cuenta está lista para usarse.
                      </p>
                      <p style="margin:12px 0 0; font-family:Segoe UI,Roboto,Arial,sans-serif; font-size:14px; line-height:1.7; color:${muted};">
                        Ingresa ahora para explorar todas las funciones.
                      </p>

                      <!-- Button -->
                      <table role="presentation" cellpadding="0" cellspacing="0" style="margin:28px auto 0;">
                        <tr>
                          <td align="center" bgcolor="${primary}" style="border-radius:12px;">
                            <!--[if mso]>
                            <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" arcsize="20%" href="${appUrl}" style="height:48px;v-text-anchor:middle;width:240px;" stroke="f" fillcolor="${primary}">
                              <w:anchorlock/>
                              <center style="color:#ffffff;font-family:Segoe UI,Roboto,Arial,sans-serif;font-size:16px;font-weight:bold;">
                                Entrar a ${appName} →
                              </center>
                            </v:roundrect>
                            <![endif]-->
                            <![if !mso]>
                              <a class="btn" href="${appUrl}" target="_blank"
                                style="display:inline-block; padding:14px 22px; min-width:220px; text-align:center; border-radius:12px; background: linear-gradient(90deg, ${primary}, ${secondary}); color:#fff; font-family:Segoe UI,Roboto,Arial,sans-serif; font-size:16px; font-weight:700;">
                                Entrar a ${appName} →
                              </a>
                            <![endif]>
                          </td>
                        </tr>
                      </table>

                      <!-- Fallback URL -->
                      <p style="margin:24px 0 0; font-family:Segoe UI,Roboto,Arial,sans-serif; font-size:12px; line-height:1.7; color:${muted};">
                        Si el botón no funciona, copia y pega este enlace en tu navegador:
                      </p>
                      <p style="margin:8px 0 0; font-family:Segoe UI,Roboto,Arial,sans-serif; font-size:12px; word-break:break-all;">
                        <a href="${appUrl}" style="color:${primary}; text-decoration:underline;">${appUrl}</a>
                      </p>

                      <!-- Tips (opcional) -->
                      <div style="height:1px; background:#e5e7eb; margin:28px 0;"></div>

                      <p style="margin:16px 0 0; font-family:Segoe UI,Roboto,Arial,sans-serif; font-size:12px; color:${muted};">
                        © ${new Date().getFullYear()} ${appName}. Todos los derechos reservados.
                      </p>
                    </td>
                  </tr>
                </table>

              </td>
            </tr>
          </table>

        </td>
      </tr>
    </table>
  </body>
</html>`;
}

export function welcomeEmailText({
  appUrl,
  appName = "Automation WS",
  userName = "Cliente",
}: {
  appUrl: string;
  appName?: string;
  userName?: string;
}) {
  return `¡Bienvenido(a) a ${appName}!

Hola ${userName}, tu cuenta ya está lista.
Entra aquí para comenzar:
${appUrl}

Si necesitas ayuda, contáctanos.`;
}