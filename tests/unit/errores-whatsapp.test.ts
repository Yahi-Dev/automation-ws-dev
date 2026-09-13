import { describe, it, expect } from "vitest";
import { explicarErrorWhatsApp } from "@/src/lib/errores-whatsapp";

// Estos textos los lee una persona sin conocimientos tecnicos, sola, en el
// momento en que algo no funciona. Un mensaje que no diga el siguiente paso es
// lo mismo que no decir nada.

describe("explicarErrorWhatsApp", () => {
  it("explica la conexion caducada del WhatsApp de prueba (63015)", () => {
    const texto = explicarErrorWhatsApp("63015");
    expect(texto).toContain("3 días");
    expect(texto).toContain("vuelva a enviar el mensaje de conexión");
  });

  it("explica el plazo de 24 horas (63016) y dice como seguir", () => {
    const texto = explicarErrorWhatsApp(63016);
    expect(texto).toContain("24 horas");
    expect(texto).toContain("plantilla aprobada");
  });

  it("manda a revisar la ficha cuando el numero esta mal (21211, 63003)", () => {
    for (const codigo of ["21211", "63003"]) {
      expect(explicarErrorWhatsApp(codigo)).toContain("ficha del contacto");
    }
  });

  // El codigo llega del SDK de Twilio y puede ser numero o texto. Si el tipo
  // decidiera si se reconoce o no, la mitad de los fallos caerian al texto
  // generico sin motivo.
  it("da igual que el codigo llegue como numero o como texto", () => {
    expect(explicarErrorWhatsApp(63016)).toBe(explicarErrorWhatsApp("63016"));
    expect(explicarErrorWhatsApp(" 63016 ")).toBe(explicarErrorWhatsApp("63016"));
  });

  // Inventar una explicacion para un codigo que no se conoce manda a arreglar
  // lo que no esta roto. Se dice la verdad y se da el numero, que es lo unico
  // que permite averiguarlo.
  it("un codigo desconocido no se inventa: se enseña tal cual", () => {
    const texto = explicarErrorWhatsApp("99999");
    expect(texto).toContain("99999");
    expect(texto).not.toContain("24 horas");
  });

  it("sin codigo, dice algo util en vez de callarse", () => {
    for (const vacio of [null, undefined, ""]) {
      const texto = explicarErrorWhatsApp(vacio);
      expect(texto).toContain("Vuelve a intentarlo");
    }
  });

  it("ningun mensaje deja a la persona sin saber qué hacer", () => {
    const codigos = ["63015", "63016", "63003", "63007", "21211", "20003", "99999", ""];
    for (const codigo of codigos) {
      const texto = explicarErrorWhatsApp(codigo);
      expect(texto.length).toBeGreaterThan(40);
      // Nada de vocabulario interno del proveedor.
      expect(texto.toLowerCase()).not.toContain("twilio");
      expect(texto.toLowerCase()).not.toContain("channel");
      expect(texto.toLowerCase()).not.toContain("sandbox");
    }
  });
});
