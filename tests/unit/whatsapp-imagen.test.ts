import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * Que la foto adjunta llegue de verdad.
 *
 * Este es el modo de fallo que se arreglo aqui: la app dejaba adjuntar una
 * imagen a la campana, la guardaba, la ensenaba en pantalla... y al enviar
 * mandaba solo el texto. Nadie se enteraba, porque ningun error salta cuando
 * simplemente no mandas algo.
 *
 * Y el reves tambien importa: con plantilla NO se puede adjuntar, porque la
 * imagen forma parte de lo que WhatsApp aprobo y mandarla por fuera hace que
 * rechacen el mensaje entero.
 */

const crearMensaje = vi.fn().mockResolvedValue({ sid: "MM123", status: "queued" });

vi.mock("@/src/lib/twilio", () => ({
  getTwilioClientFromConfig: async () => ({ messages: { create: crearMensaje } }),
}));

vi.mock("@/src/lib/app-config", () => ({
  getTwilioConfig: async () => ({
    whatsappFrom: "+14155238886",
    messagingServiceSid: undefined,
    contentBaseUrl: "https://content.twilio.com/v1",
    templateLanguage: "es",
    batchSize: 10,
    delayMs: 1000,
    requireOptIn: true,
  }),
}));

const { sendWhatsAppMessage } = await import("@/src/lib/whatsapp");

beforeEach(() => {
  crearMensaje.mockClear();
});

describe("enviar con imagen", () => {
  it("adjunta la foto en un mensaje de texto libre", async () => {
    await sendWhatsAppMessage({
      to: "+18091234567",
      body: "Mira esta oferta",
      mediaUrl: "https://res.cloudinary.com/x/foto.jpg",
    });

    const enviado = crearMensaje.mock.calls[0][0];
    expect(enviado.mediaUrl).toEqual(["https://res.cloudinary.com/x/foto.jpg"]);
    // El texto sigue yendo: en WhatsApp se convierte en el pie de foto.
    expect(enviado.body).toBe("Mira esta oferta");
  });

  // Twilio espera un arreglo aunque WhatsApp solo admita un archivo. Mandarlo
  // como texto suelto lo rechaza.
  it("lo manda como arreglo, que es lo que espera Twilio", async () => {
    await sendWhatsAppMessage({ to: "+18091234567", body: "hola", mediaUrl: "https://x/f.jpg" });

    const enviado = crearMensaje.mock.calls[0][0];
    expect(Array.isArray(enviado.mediaUrl)).toBe(true);
    expect(enviado.mediaUrl).toHaveLength(1);
  });

  it("sin foto, no manda el campo vacio", async () => {
    await sendWhatsAppMessage({ to: "+18091234567", body: "hola" });

    const enviado = crearMensaje.mock.calls[0][0];
    expect(enviado.mediaUrl).toBeUndefined();
  });

  // Lo contrario del primer caso, y igual de importante: adjuntar una imagen a
  // un envio con plantilla hace que WhatsApp rechace el mensaje entero.
  it("con plantilla NO adjunta nada, aunque se le pase una foto", async () => {
    await sendWhatsAppMessage({
      to: "+18091234567",
      contentSid: "HXabc123",
      contentVariables: { "1": "Juan" },
      mediaUrl: "https://res.cloudinary.com/x/foto.jpg",
    });

    const enviado = crearMensaje.mock.calls[0][0];
    expect(enviado.mediaUrl).toBeUndefined();
    expect(enviado.contentSid).toBe("HXabc123");
    // Y el cuerpo tampoco: el texto lo pone la plantilla.
    expect(enviado.body).toBeUndefined();
  });
});
