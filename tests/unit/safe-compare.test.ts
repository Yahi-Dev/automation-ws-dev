import { describe, it, expect } from "vitest";
import { safeEqual } from "@/src/lib/safe-compare";

describe("safeEqual", () => {
  it("acepta cadenas identicas", () => {
    expect(safeEqual("token-secreto", "token-secreto")).toBe(true);
  });

  it("rechaza cadenas distintas de la misma longitud", () => {
    expect(safeEqual("token-secreto", "token-secretx")).toBe(false);
  });

  it("rechaza longitudes distintas sin lanzar", () => {
    expect(safeEqual("corto", "mucho-mas-largo")).toBe(false);
  });

  it("rechaza null y undefined en vez de tratarlos como iguales", () => {
    expect(safeEqual(null, null)).toBe(false);
    expect(safeEqual(undefined, undefined)).toBe(false);
    expect(safeEqual(null, "x")).toBe(false);
    expect(safeEqual("", "")).toBe(true);
  });

  it("compara correctamente con caracteres multibyte", () => {
    expect(safeEqual("ñandú", "ñandú")).toBe(true);
    expect(safeEqual("ñandú", "nandu")).toBe(false);
  });
});
