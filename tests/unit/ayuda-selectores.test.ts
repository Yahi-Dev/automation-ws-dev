import { describe, it, expect } from "vitest";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import {
  RECORRIDOS,
  recorridoDeRuta,
  recorridosVisibles,
} from "@/src/features/ayuda/recorridos";

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

describe("indice del manual: que se ofrece a cada rol", () => {
  // El indice no es un control de acceso, pero si ofrece una pantalla cerrada,
  // quien lo usa acaba en una redireccion al inicio y cree que se equivoco.
  const SOLO_ADMIN = ["Usuarios", "Configuración"];

  it("el administrador ve el manual entero", () => {
    expect(recorridosVisibles("admin").map((r) => r.nombre)).toEqual(
      RECORRIDOS.map((r) => r.nombre)
    );
  });

  it("quien no es administrador no ve las pantallas de administrador", () => {
    for (const rol of ["user", undefined]) {
      const nombres = recorridosVisibles(rol).map((r) => r.nombre);
      for (const reservada of SOLO_ADMIN) {
        expect(nombres, `rol ${rol} no deberia ver ${reservada}`).not.toContain(reservada);
      }
    }
  });

  it("no se le esconde nada mas de la cuenta a quien no es administrador", () => {
    const nombres = recorridosVisibles("user").map((r) => r.nombre);
    const esperados = RECORRIDOS.map((r) => r.nombre).filter(
      (n) => !SOLO_ADMIN.includes(n)
    );
    expect(nombres).toEqual(esperados);
  });

  it("un rol desconocido se trata como el mas restrictivo", () => {
    // Si manana el campo trae "ADMIN", "owner" o una cadena vacia, lo peor que
    // puede pasar es que sobre una entrada; nunca que se ofrezca de mas.
    for (const rol of ["ADMIN", "owner", ""]) {
      const nombres = recorridosVisibles(rol).map((r) => r.nombre);
      for (const reservada of SOLO_ADMIN) {
        expect(nombres).not.toContain(reservada);
      }
    }
  });
});

/**
 * Resuelve la carpeta de src/app que pinta una ruta.
 *
 * Los grupos de rutas de Next (`(authenticated)`, `(guest)`) no forman parte de
 * la URL, asi que "/usuarios" puede vivir en "src/app/(authenticated)/usuarios".
 */
function carpetaDeRuta(ruta: string): string | null {
  const segmentos = ruta.split("/").filter(Boolean);

  let candidatos = [join(process.cwd(), "src", "app")];
  for (const segmento of segmentos) {
    const siguientes: string[] = [];
    for (const base of candidatos) {
      const directo = join(base, segmento);
      if (existsSync(directo)) siguientes.push(directo);

      // Un nivel de grupo de rutas entre medias.
      for (const entrada of readdirSync(base)) {
        if (!entrada.startsWith("(")) continue;
        const dentro = join(base, entrada, segmento);
        if (existsSync(dentro)) siguientes.push(dentro);
      }
    }
    if (siguientes.length === 0) return null;
    candidatos = siguientes;
  }

  return candidatos.find((c) => existsSync(join(c, "page.tsx"))) ?? null;
}

/**
 * El recorrido solo existe si alguien monta <BotonAyuda /> en esa pantalla, ya
 * sea la propia pagina (via AppLayout) o un layout por encima.
 */
function tieneAyudaMontada(carpeta: string): boolean {
  const pagina = readFileSync(join(carpeta, "page.tsx"), "utf8");
  if (pagina.includes("AppLayout") || pagina.includes("BotonAyuda")) return true;

  const raiz = join(process.cwd(), "src", "app");
  let actual = carpeta;
  while (actual.startsWith(raiz)) {
    const layout = join(actual, "layout.tsx");
    if (existsSync(layout) && readFileSync(layout, "utf8").includes("BotonAyuda")) {
      return true;
    }
    if (actual === raiz) break;
    actual = dirname(actual);
  }
  return false;
}

describe("cada recorrido llega a una pantalla que sabe lanzarlo", () => {
  /**
   * Este test cubre un fallo que ya ocurrio y que no se ve por ningun lado: un
   * recorrido perfecto, registrado y ofrecido en el indice, apuntando a una
   * pantalla que no monta <BotonAyuda />. El indice llevaba alli con `?ayuda=1`
   * y no arrancaba nada; para quien lo usa, el manual simplemente "no hace
   * nada" y no hay forma de adivinar por que.
   */
  for (const recorrido of RECORRIDOS) {
    it(`${recorrido.nombre} -> ${recorrido.ruta}`, () => {
      const carpeta = carpetaDeRuta(recorrido.ruta);
      expect(carpeta, `no hay ninguna pantalla en ${recorrido.ruta}`).not.toBeNull();
      expect(
        tieneAyudaMontada(carpeta as string),
        `${recorrido.ruta} no monta <BotonAyuda />: el recorrido no arrancaria ` +
          "ni desde el boton flotante ni desde el indice del manual."
      ).toBe(true);
    });
  }
});
