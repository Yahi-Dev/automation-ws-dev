// src/lib/cuota-diaria.ts
//
// El tope de mensajes que WhatsApp deja iniciar cada 24 horas.
//
// POR QUE EXISTE
//
// WhatsApp no deja escribirle a quien quieras, cuando quieras, en la cantidad
// que quieras. Cada número tiene un límite de CONVERSACIONES NUEVAS que puede
// empezar en un período de 24 horas. Un número sin verificación de negocio se
// queda en 250 y no sube de ahí nunca.
//
// Hasta ahora la app no sabía nada de ese límite. Mandaba 500 por ejecución y
// el reloj volvía a llamar cinco minutos después: una campaña de 3.000
// contactos salía entera en menos de una hora. Lo que pasa entonces no es solo
// que Meta rechace lo que sobra — es que pasarse del límite baja la
// CALIFICACIÓN DE CALIDAD del número, y esa calificación es lo que decide si te
// dejan seguir enviando o te bloquean.
//
// Dicho claro: sin esto, el primer envío grande del dueño de la app podía
// costarle el número. Y no habría forma de saber por qué.
//
// COMO SE CUENTA
//
// Se cuentan CONTACTOS DISTINTOS a los que salió un mensaje en las últimas 24
// horas, no mensajes. Es lo que cuenta Meta: escribirle tres veces a la misma
// persona es una conversación, no tres.
//
// La ventana es deslizante (las últimas 24 h desde ahora), no el día natural.
// Así es como lo mide Meta, y además es lo prudente: con día natural, enviar a
// las 23:50 y otra vez a las 00:10 serían dos días distintos para nosotros y
// las mismas 24 horas para ellos.
import prisma from "./prisma";

/**
 * Conversaciones nuevas permitidas cada 24 h.
 *
 * 250 es el techo de un número SIN verificación de negocio de Meta, que es la
 * situación de este despliegue y no va a cambiar: la verificación exige
 * documentos de registro del negocio y un dominio propio con web.
 *
 * Si algún día se verifica y Meta sube el escalón (1.000 → 10.000 → 100.000),
 * se cambia con la variable de entorno WHATSAPP_DAILY_QUOTA. Poner 0 la
 * desactiva, que solo tiene sentido en pruebas.
 */
export const CUOTA_DIARIA = Math.max(
  0,
  Number(process.env.WHATSAPP_DAILY_QUOTA ?? 250)
);

const VENTANA_MS = 24 * 60 * 60 * 1000;

export type EstadoCuota = {
  /** El tope configurado. 0 = sin tope. */
  cuota: number;
  /** Contactos distintos a los que ya se escribió en las últimas 24 h. */
  usados: number;
  /** Cuántos caben todavía. Infinity cuando no hay tope. */
  disponibles: number;
};

/**
 * Cuánto queda del cupo de hoy.
 *
 * `ahora` entra por parámetro para que las pruebas no dependan del reloj.
 */
export async function estadoCuota(ahora: Date = new Date()): Promise<EstadoCuota> {
  if (CUOTA_DIARIA <= 0) {
    return { cuota: 0, usados: 0, disponibles: Number.POSITIVE_INFINITY };
  }

  const desde = new Date(ahora.getTime() - VENTANA_MS);

  // Consulta directa en vez de groupBy: `groupBy` traería una fila por contacto
  // para luego contarlas en memoria, y con una campaña grande eso son miles de
  // filas por cada comprobación. `COUNT(DISTINCT ...)` lo resuelve la base de
  // datos, y se apoya en el índice de `sentAt`.
  const filas = await prisma.$queryRaw<Array<{ usados: bigint | number }>>`
    SELECT COUNT(DISTINCT contactId) AS usados
    FROM message
    WHERE sentAt >= ${desde}
      AND isDeleted = false
  `;

  const usados = Number(filas[0]?.usados ?? 0);

  return {
    cuota: CUOTA_DIARIA,
    usados,
    disponibles: Math.max(0, CUOTA_DIARIA - usados),
  };
}

/**
 * El aviso que lee una persona, no un registro técnico.
 *
 * Tiene que explicar tres cosas: que no es un fallo de la app, que lo que falta
 * no se ha perdido, y cuándo se reanuda solo. Sin eso, quien lo ve da por hecho
 * que la campaña se rompió y la vuelve a lanzar, que es justo lo peor.
 */
export function avisoCuotaAgotada(estado: EstadoCuota): string {
  return (
    `Se alcanzó el límite de ${estado.cuota} personas nuevas cada 24 horas que permite WhatsApp. ` +
    "No es un fallo de la aplicación y no se perdió nada: los mensajes que faltan siguen en espera " +
    "y salen solos en cuanto se libere cupo, sin que tengas que hacer nada."
  );
}

/**
 * El aviso cuando una campaña salió a medias por el tope.
 */
export function avisoCuotaParcial(enviados: number, restantes: number, cuota: number): string {
  return (
    `Se enviaron ${enviados} y quedan ${restantes} en espera. ` +
    `WhatsApp solo permite empezar ${cuota} conversaciones nuevas cada 24 horas, así que el resto ` +
    "sale solo a lo largo de los próximos días. No hay que volver a pulsar nada."
  );
}
