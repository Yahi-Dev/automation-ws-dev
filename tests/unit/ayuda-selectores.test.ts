import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { RECORRIDOS, recorridoDeRuta } from "@/src/features/ayuda/recorridos";

/**
 * El manual guiado apunta a elementos del marcado con selectores CSS.
 *
 * Su modo de fallo es TRAICIONERO: si un selector deja de encajar, driver.js
 * salta ese paso en silencio (skipMissingElement). El recorrido sigue
 * funcionando y nadie se entera de que la explicacion desaparecio. Como el
 * manual es para una persona mayor que depende de el, un paso que se salta es
 * exactamente la ayuda que le hace falta y no recibe.
 *
 * Este test recorre todos los pasos y comprueba que su selector corresponde a
 * marcado que existe de verdad en el codigo.
 */

const SRC = join(process.cwd(), "src");

/**
 * Se EXCLUYE la propia carpeta del manual.
 *
 * Sin esta exclusion el test es inutil y ademas enganoso: los archivos de
 * recorridos viven dentro de src/, asi que cada selector se encontraba a si
 * mismo en su propia definicion y la comprobacion pasaba SIEMPRE, incluso
 * apuntando a un elemento inventado.
 */
const EXCLUIDO = join(SRC, "features", "ayuda");

function leerFuentes(dir: string, acc: string[] = []): string[] {
  if (dir.startsWith(EXCLUIDO)) return acc;

  for (const entrada of readdirSync(dir)) {
    const ruta = join(dir, entrada);
    if (statSync(ruta).isDirectory()) leerFuentes(ruta, acc);
    else if (/\.(tsx?|jsx?)$/.test(entrada)) acc.push(readFileSync(ruta, "utf8"));
  }
  return acc;
}

const FUENTES = leerFuentes(SRC).join("\n");

const pasos = RECORRIDOS.flatMap((r) =>
  r.pasos.map((p, i) => ({ recorrido: r.nombre, indice: i, ...p }))
);

describe("manual guiado: estructura", () => {
  it("hay un recorrido por cada pantalla principal", () => {
    expect(RECORRIDOS.length).toBeGreaterThanOrEqual(8);
  });

  it("las rutas y los nombres no se repiten", () => {
    const rutas = RECORRIDOS.map((r) => r.ruta);
    const nombres = RECORRIDOS.map((r) => r.nombre);
    expect(new Set(rutas).size).toBe(rutas.length);
    expect(new Set(nombres).size).toBe(nombres.length);
  });

  it("cada recorrido empieza con un paso de bienvenida sin elemento", () => {
    // El primer paso sale centrado y explica para que sirve la pantalla. Si
    // llevara elemento, la persona veria un globo senalando algo antes de saber
    // donde esta.
    for (const r of RECORRIDOS) {
      expect(r.pasos.length, `${r.nombre} no tiene pasos`).toBeGreaterThan(0);
      expect(r.pasos[0].elemento, `${r.nombre} empieza senalando un elemento`).toBeUndefined();
    }
  });

  it("ningun paso se queda sin titulo ni sin explicacion", () => {
    for (const p of pasos) {
      expect(p.titulo.trim().length, `${p.recorrido}[${p.indice}] sin titulo`).toBeGreaterThan(0);
      expect(
        p.descripcion.trim().length,
        `${p.recorrido}[${p.indice}] sin descripcion`
      ).toBeGreaterThan(20);
    }
  });
});

describe("manual guiado: los selectores apuntan a marcado real", () => {
  const conElemento = pasos.filter((p) => p.elemento);

  it("hay una cantidad razonable de pasos con elemento", () => {
    expect(conElemento.length).toBeGreaterThan(30);
  });

  for (const paso of conElemento) {
    const selector = paso.elemento as string;

    it(`${paso.recorrido}[${paso.indice}] -> ${selector}`, () => {
      const dataTour = selector.match(/^\[data-tour="([^"]+)"\]$/);
      if (dataTour) {
        expect(
          FUENTES.includes(`data-tour="${dataTour[1]}"`),
          `Ningun elemento lleva data-tour="${dataTour[1]}". ` +
            "El paso se saltaria en silencio: anade el atributo o cambia el selector."
        ).toBe(true);
        return;
      }

      const enlace = selector.match(/^a\[href="([^"]+)"\]$/);
      if (enlace) {
        expect(
          FUENTES.includes(`url: "${enlace[1]}"`) || FUENTES.includes(`href="${enlace[1]}"`),
          `No hay ningun enlace a ${enlace[1]} en el codigo (revisa data.navMain en app-sidebar.tsx).`
        ).toBe(true);
        return;
      }

      // Cualquier otra forma de selector es fragil por definicion: una clase de
      // Tailwind o un selector de etiqueta suelto deja de encajar en cuanto
      // alguien retoca el diseno, y el fallo es invisible.
      throw new Error(
        `Selector no admitido: "${selector}". Usa [data-tour="..."] o a[href="..."], ` +
          "que son los unicos estables ante cambios de estilo."
      );
    });
  }
});

describe("recorridoDeRuta", () => {
  it("encuentra el recorrido exacto de cada pantalla", () => {
    for (const r of RECORRIDOS) {
      expect(recorridoDeRuta(r.ruta)?.nombre).toBe(r.nombre);
    }
  });

  it("encuentra el recorrido desde una subruta", () => {
    expect(recorridoDeRuta("/contacts/create")?.nombre).toBe("Contactos");
  });

  it("no devuelve nada para una ruta desconocida o vacia", () => {
    expect(recorridoDeRuta("/una-pantalla-que-no-existe")).toBeNull();
    expect(recorridoDeRuta(null)).toBeNull();
    expect(recorridoDeRuta("")).toBeNull();
  });
});
