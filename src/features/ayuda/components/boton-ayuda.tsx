"use client";

// src/features/ayuda/components/boton-ayuda.tsx
//
// Boton flotante de ayuda: lanza el recorrido guiado de la pantalla actual.
//
// Por que existe: la app la va a usar una persona mayor sin experiencia
// tecnica. Un manual en PDF no se lee; una flecha que senala el boton que hay
// que pulsar, si. El recorrido se lanza SOLO la primera vez que se entra en
// cada pantalla, y a partir de ahi queda siempre a mano en este boton.
//
// Hay una segunda via de entrada: el indice del manual (boton-manual.tsx)
// navega a la pantalla con `?ayuda=1` y este componente entiende ese aviso y
// arranca el recorrido AUNQUE ya se hubiera visto, porque en ese caso lo pidio
// la persona a proposito.
import { Suspense, useCallback, useEffect, useMemo, useRef } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { HelpCircle } from "lucide-react";
import { driver, type Driver } from "driver.js";
import "driver.js/dist/driver.css";
import { recorridoDeRuta } from "../recorridos";
import type { RecorridoAyuda } from "../tipos";

/** Prefijo en localStorage para recordar que recorridos ya se vieron. */
const CLAVE_VISTO = "ayuda-vista:";

/**
 * Parametro con el que el indice del manual pide el recorrido de la pantalla
 * a la que acaba de llevar. Se exporta para que quien lo pone y quien lo lee
 * no puedan escribirlo distinto.
 */
export const PARAMETRO_AYUDA = "ayuda";

/**
 * Cuanto se espera antes de arrancar, y cada cuanto se mira si la pantalla ya
 * esta pintada.
 *
 * El minimo (900 ms) es el que ya habia: da tiempo a que la tabla o el
 * formulario aparezcan y, sobre todo, evita que el globo salte encima de una
 * pantalla que todavia se esta montando.
 *
 * El maximo es nuevo y hace falta por el indice del manual: cuando la
 * navegacion la provoca el modal, la pantalla de destino se pide al servidor en
 * ese momento, asi que a los 900 ms puede que aun no haya nada que senalar y el
 * primer paso se saltaria EN SILENCIO. Por eso ya no se espera un rato fijo: se
 * espera hasta que el primer elemento del recorrido exista de verdad, con un
 * tope para no dejar a nadie mirando una pantalla que no responde (si se agota,
 * se lanza igual y driver.js salta lo que falte).
 */
const ESPERA_MINIMA_MS = 900;
const ESPERA_MAXIMA_MS = 4000;
const INTERVALO_MS = 100;

function yaSeVio(nombre: string): boolean {
  try {
    return window.localStorage.getItem(CLAVE_VISTO + nombre) === "1";
  } catch {
    // Navegador con el almacenamiento bloqueado: se comporta como si no se
    // hubiera visto nunca. Peor es fallar y quedarse sin ayuda.
    return false;
  }
}

function marcarVisto(nombre: string) {
  try {
    window.localStorage.setItem(CLAVE_VISTO + nombre, "1");
  } catch {
    // Sin almacenamiento el recorrido se ofrecera otra vez. No es grave.
  }
}

/** El selector del primer paso que senala algo: es por donde empieza a mirar. */
function primerSelector(r: RecorridoAyuda): string | undefined {
  return r.pasos.find((p) => p.elemento)?.elemento;
}

function estaEnPantalla(selector: string | undefined): boolean {
  // Un recorrido sin ningun paso con elemento (todo globos centrados) no tiene
  // nada que esperar.
  if (!selector) return true;
  try {
    return document.querySelector(selector) !== null;
  } catch {
    // Selector mal escrito: no se puede comprobar, asi que no se bloquea el
    // arranque por ello.
    return true;
  }
}

function BotonAyudaInterno() {
  const ruta = usePathname();
  const parametros = useSearchParams();
  const router = useRouter();
  const instancia = useRef<Driver | null>(null);

  // Antes esto era estado + efecto, y eso dejaba `recorrido` en null durante el
  // primer render de cada pantalla. Con `?ayuda=1` esa demora se convertia en
  // una carrera: el efecto veia el parametro cuando todavia no habia recorrido,
  // lo limpiaba, y para cuando el recorrido llegaba ya no quedaba peticion que
  // atender. Derivarlo del pathname quita la carrera y no cambia lo que se
  // pinta.
  const recorrido = useMemo(() => recorridoDeRuta(ruta), [ruta]);

  // Como string, para que las dependencias del efecto comparen por valor y no
  // por la identidad del objeto de parametros, que cambia en cada navegacion.
  const consulta = parametros.toString();
  const pedidoExplicito = parametros.get(PARAMETRO_AYUDA) === "1";

  // Ultimo recorrido del que ya se encargo este componente. Sin esta marca, el
  // re-render que provoca limpiar el parametro volveria a disparar el
  // auto-lanzado y el recorrido se reiniciaria encima del que se esta leyendo.
  const atendido = useRef<string | null>(null);

  const lanzar = useCallback((r: RecorridoAyuda) => {
    // Se descarta cualquier recorrido anterior: cambiar de pantalla con la
    // ayuda abierta dejaria el fondo oscurecido sobre la pantalla nueva.
    instancia.current?.destroy();

    const conductor = driver({
      showProgress: true,
      progressText: "Paso {{current}} de {{total}}",
      nextBtnText: "Siguiente",
      prevBtnText: "Anterior",
      doneBtnText: "Entendido",
      // Texto grande y legible: ver src/app/globals.css (.ayuda-popover).
      popoverClass: "ayuda-popover",
      // Lleva la pantalla hasta el elemento resaltado si esta mas abajo.
      smoothScroll: true,
      // Margen generoso alrededor de lo resaltado: se ve mejor que va senalado.
      stagePadding: 8,
      steps: r.pasos.map((paso) => ({
        element: paso.elemento,
        popover: {
          title: paso.titulo,
          description: paso.descripcion,
          side: paso.lado,
          align: paso.alineacion,
        },
        // Un paso cuyo elemento no esta en pantalla (una tabla vacia, un boton
        // que solo ve el administrador) se salta en vez de mostrar un globo
        // suelto en el centro que no senala nada.
        skipMissingElement: true,
      })),
      onDestroyed: () => marcarVisto(r.nombre),
    });

    instancia.current = conductor;
    conductor.drive();
  }, []);

  /** Quita `?ayuda=1` de la barra de direcciones conservando el resto. */
  const limpiarParametro = useCallback(() => {
    const restantes = new URLSearchParams(consulta);
    restantes.delete(PARAMETRO_AYUDA);
    const cola = restantes.toString();
    // `replace` y no `push`: el aviso es un detalle interno, no un sitio al que
    // volver con la flecha de atras. Y sin el parametro, recargar la pagina ya
    // no vuelve a disparar el recorrido.
    // `scroll: false` para que la pagina no salte al principio justo cuando el
    // recorrido acaba de senalar un elemento.
    router.replace(cola ? `${ruta}?${cola}` : ruta, { scroll: false });
  }, [consulta, router, ruta]);

  useEffect(() => {
    if (!recorrido) {
      // Pantalla sin recorrido: si alguien llego con el parametro (un enlace
      // guardado, por ejemplo) se quita igualmente para no dejar basura.
      if (pedidoExplicito) limpiarParametro();
      return;
    }

    if (!pedidoExplicito) {
      // Auto-lanzado de primera visita: como estaba, una sola vez por pantalla.
      if (atendido.current === recorrido.nombre) return;
      if (yaSeVio(recorrido.nombre)) return;
    }

    const selector = primerSelector(recorrido);
    const desde = Date.now();
    let temporizador: ReturnType<typeof setTimeout>;

    const intentar = () => {
      const esperado = Date.now() - desde;
      const listo = esperado >= ESPERA_MINIMA_MS && estaEnPantalla(selector);

      if (!listo && esperado < ESPERA_MAXIMA_MS) {
        temporizador = setTimeout(intentar, INTERVALO_MS);
        return;
      }

      // La marca se pone AQUI, no al entrar en el efecto. Si se pusiera antes
      // de la espera, salir de la pantalla mientras se espera (o cualquier
      // cambio en la URL que reevalue el efecto) dejaria el recorrido marcado
      // como atendido sin haberse llegado a ver, y como tampoco se guarda nada
      // en localStorage hasta que se cierra, la explicacion de la primera
      // visita se perderia EN SILENCIO hasta recargar la pagina entera.
      atendido.current = recorrido.nombre;

      lanzar(recorrido);

      // El parametro se limpia DESPUES de arrancar. Al reves no funcionaria:
      // `replace` cambia la URL, el efecto se vuelve a evaluar y su limpieza
      // cancelaria el temporizador que todavia estaba esperando a que la
      // pantalla se pintase. Al hacerlo aqui, el recorrido ya esta en marcha y
      // la vuelta del efecto se topa con la marca de `atendido`.
      if (pedidoExplicito) limpiarParametro();
    };

    temporizador = setTimeout(intentar, INTERVALO_MS);
    return () => clearTimeout(temporizador);
  }, [recorrido, pedidoExplicito, lanzar, limpiarParametro]);

  // Al salir de la pantalla se cierra la ayuda que hubiera abierta.
  useEffect(() => {
    return () => {
      instancia.current?.destroy();
      instancia.current = null;
    };
  }, []);

  if (!recorrido) return null;

  return (
    <button
      type="button"
      onClick={() => lanzar(recorrido)}
      // Fijo abajo a la derecha, por encima de todo y siempre visible.
      className="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-full bg-emerald-600 px-5 py-3 text-base font-semibold text-white shadow-lg transition hover:bg-emerald-700 focus:outline-none focus-visible:ring-4 focus-visible:ring-emerald-300 print:hidden"
      aria-label={`Ver la ayuda de ${recorrido.nombre}`}
      title={recorrido.resumen}
    >
      <HelpCircle className="h-5 w-5" aria-hidden="true" />
      ¿Cómo funciona?
    </button>
  );
}

export function BotonAyuda() {
  // `useSearchParams` obliga a un limite de Suspense; sin el, la compilacion
  // falla en cuanto una pantalla se pueda prerenderizar. Se pone aqui dentro
  // para que quien monta la ayuda (AppLayout) no tenga que saberlo.
  return (
    <Suspense fallback={null}>
      <BotonAyudaInterno />
    </Suspense>
  );
}

export default BotonAyuda;
