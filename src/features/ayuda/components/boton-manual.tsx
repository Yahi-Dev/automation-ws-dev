"use client";

// src/features/ayuda/components/boton-manual.tsx
//
// Indice del manual: un boton "Manual" en el menu lateral que abre la lista de
// todo lo que la app sabe explicar.
//
// Por que existe: el boton flotante de ayuda solo explica la pantalla en la que
// ya estas, asi que no sirve de nada cuando lo que no sabes es EN QUE pantalla
// esta lo que buscas. Aqui se ve todo junto, con una frase de que hace cada
// cosa, y al elegir una la app te lleva alli y arranca sola la explicacion:
// asi no hay que acordarse de pulsar despues ningun otro boton.
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { IconBook } from "@tabler/icons-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/src/components/ui/dialog";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/src/components/ui/sidebar";
import { recorridosVisibles } from "../recorridos";
import { PARAMETRO_AYUDA } from "./boton-ayuda";

export function BotonManual({ rol }: { rol?: string }) {
  const router = useRouter();
  const [abierto, setAbierto] = useState(false);

  // No se ofrecen pantallas a las que esa persona no puede entrar: una entrada
  // que acabara en una redireccion haria pensar que el manual esta roto.
  const recorridos = useMemo(() => recorridosVisibles(rol), [rol]);

  const irYExplicar = (ruta: string) => {
    // Primero se cierra: si no, el fondo oscuro del modal se quedaria encima de
    // la pantalla nueva mientras el recorrido intenta senalar cosas.
    setAbierto(false);
    // El `?ayuda=1` es el aviso que recoge boton-ayuda.tsx al llegar: lanza el
    // recorrido aunque ya se hubiera visto y despues limpia el parametro.
    router.push(`${ruta}?${PARAMETRO_AYUDA}=1`);
  };

  return (
    <>
      <SidebarMenu>
        <SidebarMenuItem>
          {/* Mismo aspecto que los enlaces de nav-main.tsx para que no parezca
              un boton raro pegado abajo, sino una opcion mas del menu. */}
          <SidebarMenuButton
            onClick={() => setAbierto(true)}
            aria-haspopup="dialog"
            data-tour="boton-manual"
            className={[
              "group relative transition-all duration-200",
              "rounded-lg px-4 py-3",
              "hover:bg-emerald-50 hover:border-emerald-200",
              "text-gray-600 hover:text-emerald-800 border-l-4 border-transparent",
            ].join(" ")}
          >
            <IconBook className="shrink-0 h-5 w-5 text-gray-400 transition-colors duration-200 group-hover:text-emerald-500" />
            <span className="text-base">Manual</span>
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>

      <Dialog open={abierto} onOpenChange={setAbierto}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-2xl">Manual de uso</DialogTitle>
            <DialogDescription className="text-base leading-relaxed">
              Elige lo que quieras hacer. Te llevo a esa pantalla y te lo explico
              ahí mismo, paso a paso.
            </DialogDescription>
          </DialogHeader>

          {/* Tarjetas grandes y separadas, no una lista apretada: se leen de un
              vistazo y se aciertan con el dedo sin afinar. */}
          <div className="-mx-1 max-h-[60vh] space-y-3 overflow-y-auto px-1 py-1">
            {recorridos.map((recorrido) => (
              <button
                key={recorrido.ruta}
                type="button"
                onClick={() => irYExplicar(recorrido.ruta)}
                className="flex w-full flex-col gap-1 rounded-xl border-2 border-gray-200 bg-white p-5 text-left transition hover:border-emerald-400 hover:bg-emerald-50 focus:outline-none focus-visible:ring-4 focus-visible:ring-emerald-300"
              >
                <span className="text-xl font-semibold text-gray-900">
                  {recorrido.nombre}
                </span>
                <span className="text-base leading-relaxed text-gray-600">
                  {recorrido.resumen}
                </span>
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default BotonManual;
