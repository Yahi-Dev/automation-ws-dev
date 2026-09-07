import { describe, it, expect } from "vitest";
import { recorridoDeRuta, recorridosVisibles } from "@/src/features/ayuda/recorridos";

/**
 * A que recorrido corresponde cada URL.
 *
 * Es la parte fragil del manual: las pantallas de edicion tienen la forma
 * /contacts/7/edit, con un numero que cambia, asi que hace falta comodin. Si el
 * comodin se probara DESPUES de la busqueda por prefijo, "/contacts/7/edit"
 * caeria en el recorrido general de Contactos y explicaria la pantalla
 * equivocada: la persona pediria ayuda sobre el formulario y le contarian el
 * listado. No falla de forma ruidosa, solo explica otra cosa.
 */
describe("a que recorrido corresponde cada URL", () => {
  const casos: Array<[string, string]> = [
    ["/contacts/create", "Nuevo contacto"],
    ["/contacts/7/edit", "Editar contacto"],
    ["/contacts/123456/edit", "Editar contacto"],
    ["/contacts", "Contactos"],
    ["/contacts/7", "Contactos"],
    ["/posts/create", "Nueva campaña"],
    ["/posts/9/edit", "Editar campaña"],
    ["/posts", "Campañas"],
    ["/messages/assign", "Elegir destinatarios"],
    ["/messages", "Mensajes"],
  ];
  for (const [ruta, esperado] of casos) {
    it(`${ruta} -> ${esperado}`, () => {
      expect(recorridoDeRuta(ruta)?.nombre).toBe(esperado);
    });
  }

  it("los formularios NO salen en el indice", () => {
    const nombres = recorridosVisibles("admin").map((r) => r.nombre);
    for (const f of ["Nuevo contacto", "Editar contacto", "Nueva campaña", "Editar campaña", "Elegir destinatarios"]) {
      expect(nombres).not.toContain(f);
    }
    expect(nombres.length).toBe(9);
  });

  it("los formularios dicen Explicar", () => {
    for (const r of ["/contacts/create", "/posts/create", "/messages/assign", "/contacts/7/edit", "/posts/9/edit"]) {
      expect(recorridoDeRuta(r)?.etiquetaBoton).toBe("Explicar");
    }
  });
});
