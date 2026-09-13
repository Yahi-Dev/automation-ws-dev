import { describe, it, expect } from "vitest";
import type { NextRequest } from "next/server";
import { secretoDeLaPeticion } from "@/src/lib/cron-auth";

/**
 * Si esto deja de reconocer el secreto, el reloj externo recibe un 403, las
 * campanas programadas no salen, y la unica senal es un workflow en rojo en
 * GitHub que nadie esta mirando. Por eso se prueba, aunque sean cinco lineas.
 */
function peticion(opciones: { cabecera?: string; query?: string }): NextRequest {
  const url = new URL("https://ejemplo.test/api/whatsapp/dispatch");
  if (opciones.query !== undefined) url.searchParams.set("token", opciones.query);

  return {
    headers: new Headers(opciones.cabecera ? { authorization: opciones.cabecera } : {}),
    nextUrl: url,
  } as unknown as NextRequest;
}

describe("secretoDeLaPeticion", () => {
  it("lee el secreto de la cabecera Authorization", () => {
    expect(secretoDeLaPeticion(peticion({ cabecera: "Bearer abc123" }))).toBe("abc123");
  });

  // La norma dice que el nombre del esquema no distingue mayusculas. Un reloj
  // que lo escriba de otra forma no tiene por que quedarse fuera.
  it("da igual como se escriba 'Bearer'", () => {
    for (const forma of ["bearer abc123", "BEARER abc123", "BeArEr abc123"]) {
      expect(secretoDeLaPeticion(peticion({ cabecera: forma }))).toBe("abc123");
    }
  });

  it("quita los espacios de sobra", () => {
    expect(secretoDeLaPeticion(peticion({ cabecera: "Bearer   abc123  " }))).toBe("abc123");
  });

  // Se conserva a proposito: quitarlo apagaria en silencio cualquier reloj que
  // ya estuviera configurado con esta forma.
  it("sigue aceptando ?token= como antes", () => {
    expect(secretoDeLaPeticion(peticion({ query: "abc123" }))).toBe("abc123");
  });

  it("la cabecera manda sobre la direccion", () => {
    const req = peticion({ cabecera: "Bearer de-la-cabecera", query: "de-la-url" });
    expect(secretoDeLaPeticion(req)).toBe("de-la-cabecera");
  });

  // Una cabecera vacia o mal formada NO puede colarse como secreto: caeria en
  // la comparacion con CRON_SECRET y, si esa variable tampoco estuviera
  // definida, el endpoint quedaria abierto.
  it("no devuelve basura cuando la cabecera esta vacia o mal formada", () => {
    expect(secretoDeLaPeticion(peticion({ cabecera: "Bearer" }))).toBeNull();
    expect(secretoDeLaPeticion(peticion({ cabecera: "Bearer    " }))).toBeNull();
    expect(secretoDeLaPeticion(peticion({ cabecera: "Basic abc123" }))).toBeNull();
    expect(secretoDeLaPeticion(peticion({ cabecera: "abc123" }))).toBeNull();
  });

  it("sin cabecera y sin token, no hay secreto", () => {
    expect(secretoDeLaPeticion(peticion({}))).toBeNull();
  });

  it("si la cabecera no sirve, se cae al token de la direccion", () => {
    const req = peticion({ cabecera: "Basic loquesea", query: "abc123" });
    expect(secretoDeLaPeticion(req)).toBe("abc123");
  });
});
