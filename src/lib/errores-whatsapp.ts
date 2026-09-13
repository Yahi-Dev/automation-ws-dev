// src/lib/errores-whatsapp.ts
//
// Traduce los codigos de error de Twilio a algo que se pueda leer y, sobre
// todo, a algo que diga QUE HACER.
//
// Por que hace falta: cuando una respuesta no sale, lo unico que llegaba a la
// pantalla era "No se pudo enviar la respuesta". Con eso no se puede hacer
// nada. La app la usa una persona sin conocimientos tecnicos y sin nadie a
// quien preguntarle a las once de la noche: si el mensaje no explica el
// siguiente paso, el siguiente paso no existe.
//
// Solo se traducen los codigos comprobados en la documentacion de Twilio. Para
// cualquier otro se da un texto generico Y el numero del codigo, que es lo que
// permite buscarlo o contarlo por telefono. Inventar una explicacion que suene
// bien seria peor que no dar ninguna: mandaria a arreglar lo que no esta roto.

/** Codigos que se explican palabra por palabra. */
const EXPLICACIONES: Record<string, string> = {
  // "Channel Sandbox can only send messages to phone numbers that have joined
  // the Sandbox". Es EL fallo mas probable mientras se use el sandbox: la
  // union caduca a los tres dias y hay que repetirla desde el telefono.
  "63015":
    "Ese número ya no está conectado al WhatsApp de prueba. La conexión de prueba se cae sola cada 3 días. " +
    "Pídele a la persona que vuelva a enviar el mensaje de conexión, o pasa a un número propio de WhatsApp.",

  // "Outside messaging window. For WhatsApp, use a Message Template instead."
  "63016":
    "WhatsApp no dejó pasar el mensaje porque ya pasaron más de 24 horas desde que esa persona te escribió. " +
    "Para volver a escribirle tienes que mandarle una campaña con una plantilla aprobada, o esperar a que te escriba otra vez.",

  // "Channel could not find To address".
  "63003":
    "Ese número no existe en WhatsApp o está mal escrito. Revísalo en la ficha del contacto, con el código del país delante.",

  // "Twilio could not find a Channel with the specified From address".
  "63007":
    "El número desde el que escribe la app no está bien configurado. Eso se arregla en Configuración; " +
    "si no sabes qué poner, no lo toques y pide ayuda: mientras esté así no sale ningún mensaje.",

  // "Invalid 'To' Phone Number".
  "21211":
    "Ese número no tiene un formato válido. Revísalo en la ficha del contacto: tiene que llevar el código del país delante, sin espacios ni guiones.",

  // Credenciales rechazadas por Twilio.
  "20003":
    "La cuenta de WhatsApp rechazó la contraseña de la app. Hay que volver a poner las credenciales en Configuración.",
};

/**
 * Mensaje para la persona que pulsó Enviar.
 *
 * `codigo` es el `code` que devuelve el SDK de Twilio; puede llegar como
 * numero, como texto o no llegar.
 */
export function explicarErrorWhatsApp(codigo: unknown): string {
  const clave = codigo == null ? "" : String(codigo).trim();
  const conocido = EXPLICACIONES[clave];
  if (conocido) return conocido;

  if (clave) {
    // El codigo se enseña a proposito: es lo unico que permite averiguar que
    // pasó sin adivinar. Sin el, la unica opcion es probar cosas al azar.
    return (
      "WhatsApp rechazó el mensaje y no llegó. El aviso técnico es el código " +
      `${clave}. Guarda ese número: es lo que hace falta para averiguar qué pasó.`
    );
  }

  return "No se pudo enviar el mensaje. Vuelve a intentarlo en un momento; si sigue sin salir, avisa.";
}
