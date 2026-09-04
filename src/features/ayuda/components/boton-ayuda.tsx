"use client";

// src/features/ayuda/components/boton-ayuda.tsx
//
// Boton flotante de ayuda: lanza el recorrido guiado de la pantalla actual.
//
// Por que existe: la app la va a usar una persona mayor sin experiencia
// tecnica. Un manual en PDF no se lee; una flecha que senala el boton que hay
// que pulsar, si. El recorrido se lanza SOLO la primera vez que se entra en
// cada pantalla, y a partir de ahi queda siempre a mano en este boton.
import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { HelpCircle } from "lucide-react";
import { driver, type Driver } from "driver.js";
import "driver.js/dist/driver.css";
import { recorridoDeRuta } from "../recorridos";
import type { RecorridoAyuda } from "../tipos";

/** Prefijo en localStorage para recordar que recorridos ya se vieron. */
const CLAVE_VISTO = "ayuda-vista:";

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

export function BotonAyuda() {
  const ruta = usePathname();
  const [recorrido, setRecorrido] = useState<RecorridoAyuda | null>(null);
  const instancia = useRef<Driver | null>(null);

  useEffect(() => {
    setRecorrido(recorridoDeRuta(ruta));
  }, [ruta]);

  const lanzar = useCallback(
    (r: RecorridoAyuda) => {
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
    },
    []
  );

  // Primera visita a la pantalla: se ofrece el recorrido automaticamente.
  useEffect(() => {
    if (!recorrido) return;
    if (yaSeVio(recorrido.nombre)) return;

    // Pequena espera para que la tabla o el formulario terminen de pintarse:
    // si no, los selectores todavia no existen y los pasos se saltarian.
    const t = setTimeout(() => lanzar(recorrido), 900);
    return () => clearTimeout(t);
  }, [recorrido, lanzar]);

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

export default BotonAyuda;
