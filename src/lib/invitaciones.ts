// src/lib/invitaciones.ts
// Almacen EFIMERO, en memoria, del enlace de invitacion.
//
// POR QUE EXISTE
// better-auth genera el token de invitacion y envia el correo por DENTRO
// (callback `sendResetPassword` en src/lib/auth.ts), asi que el handler que
// pide la invitacion nunca llega a ver la URL. Guardandola un instante desde
// ese callback y leyendola justo despues, el endpoint puede DEVOLVER el enlace
// en su respuesta para que el administrador se lo pase a mano a la persona.
// Esa es exactamente la situacion de hoy: todavia no hay credenciales SMTP, asi
// que el correo no sale y sin este puente la invitacion seria inservible.
//
// POR QUE EN MEMORIA Y POR QUE BASTA
//   - Se escribe y se lee dentro de la MISMA peticion HTTP y del MISMO proceso:
//     `auth.api.requestPasswordReset(...)` ejecuta `sendResetPassword` en linea
//     (better-auth lo espera antes de responder), y la lectura ocurre en la
//     linea siguiente del handler. El dato nunca necesita viajar entre
//     instancias, asi que Redis o la base de datos no aportarian nada.
//   - Es un secreto de un solo uso equivalente a una contrasena: cuanto menos
//     viva y en menos sitios este, mejor. Persistirlo lo dejaria escrito en
//     disco y en las copias de seguridad sin ninguna necesidad.
//   - El TTL de 60 s es un limite superior generoso para esa ventana. Si algo
//     va mal y nadie recoge el enlace, se descarta solo.
//
// Consecuencia asumida: si el proceso se reinicia entre la escritura y la
// lectura, se pierde el enlace y el endpoint responde sin el. No hay dano: el
// administrador puede reenviar la invitacion.

/** Ventana de vida del enlace. Solo tiene que cubrir una peticion. */
const TTL_MS = 60_000;

type EnlaceGuardado = { url: string; expiraEn: number };

const enlaces = new Map<string, EnlaceGuardado>();

/** El correo es la clave; se normaliza para que guardar y tomar coincidan. */
function clave(email: string): string {
  return email.trim().toLowerCase();
}

/**
 * Descarta las entradas caducadas.
 *
 * Se hace en cada acceso, a proposito, en vez de con un `setInterval`: un
 * temporizador vivo mantendria el proceso despierto y no tiene sentido en un
 * entorno serverless. El mapa nunca crece: cada invitacion escribe una entrada
 * que se consume en la misma peticion.
 */
function purgarCaducados(ahora: number): void {
  for (const [k, guardado] of enlaces) {
    if (guardado.expiraEn <= ahora) enlaces.delete(k);
  }
}

/** Guarda el enlace de invitacion de `email` durante los proximos 60 segundos. */
export function guardarEnlace(email: string, url: string): void {
  const ahora = Date.now();
  purgarCaducados(ahora);
  enlaces.set(clave(email), { url, expiraEn: ahora + TTL_MS });
}

/**
 * Devuelve el enlace guardado para `email` y lo BORRA (un solo uso).
 * `null` si no hay ninguno o si ya habia caducado.
 */
export function tomarEnlace(email: string): string | null {
  const ahora = Date.now();
  purgarCaducados(ahora);

  const k = clave(email);
  const guardado = enlaces.get(k);
  if (!guardado) return null;

  enlaces.delete(k);
  return guardado.url;
}

// ---------------------------------------------------------------------------
// MARCA DE INVITACION
//
// `sendResetPassword` (src/lib/auth.ts) tiene que decidir si manda el texto de
// INVITACION o el de RESTABLECER CONTRASENA, y better-auth no le pasa ningun
// dato que lo distinga: el callback es el mismo para los dos casos.
//
// Antes se deducia mirando la base de datos ("no ha entrado nunca y conserva la
// contrasena provisional"). Esa deduccion es FALSA para las cuentas que ya
// existian: `temporaryPassword` nace en `true` y nadie lo baja hasta que se
// restablece la contrasena por primera vez, y `lastLogin` no lo escribe nadie.
// Resultado: a una persona que llevaba meses usando la plataforma y pulsaba
// "olvide mi contrasena" le llegaba un correo diciendole que le habian invitado.
//
// La intencion no se adivina: se declara. Quien invita marca el correo justo
// antes de pedir el enlace, y el callback consume la marca. Si no hay marca es
// un restablecimiento normal, sin ambiguedad. Misma ventana y mismo proceso que
// el enlace de arriba (better-auth espera a `sendResetPassword` antes de
// responder), asi que basta con la memoria.
// ---------------------------------------------------------------------------

const marcas = new Map<string, number>();

function purgarMarcasCaducadas(ahora: number): void {
  for (const [k, expiraEn] of marcas) {
    if (expiraEn <= ahora) marcas.delete(k);
  }
}

/** Declara que el proximo enlace que se pida para `email` es una invitacion. */
export function marcarInvitacion(email: string): void {
  const ahora = Date.now();
  purgarMarcasCaducadas(ahora);
  marcas.set(clave(email), ahora + TTL_MS);
}

/**
 * Indica si habia una invitacion en curso para `email` y BORRA la marca.
 * `false` significa "restablecimiento normal de contrasena".
 *
 * Sirve tambien para limpiar: si el envio no llega a ocurrir, quien invito la
 * consume igualmente para no dejarla viva.
 */
export function consumirMarcaInvitacion(email: string): boolean {
  const ahora = Date.now();
  purgarMarcasCaducadas(ahora);
  return marcas.delete(clave(email));
}
