// src/features/ayuda/recorridos.ts
//
// Registro de recorridos guiados, uno por pantalla.
//
// Los contenidos de cada pantalla viven en archivos separados dentro de
// ./recorridos/ para que se puedan escribir y revisar por separado.
import type { RecorridoAyuda } from "./tipos";
import { recorridoDashboard } from "./recorridos/dashboard";
import { recorridoContactos } from "./recorridos/contactos";
import { recorridoCampanas } from "./recorridos/campanas";
import { recorridoMensajes } from "./recorridos/mensajes";
import { recorridoEntrantes } from "./recorridos/entrantes";
import { recorridoConsentimiento } from "./recorridos/consentimiento";
import { recorridoPlantillas } from "./recorridos/plantillas";
import { recorridoConfiguracion } from "./recorridos/configuracion";

/**
 * Todos los recorridos.
 *
 * IMPORTANTE: el orden importa. `recorridoDeRuta` devuelve el PRIMERO cuya ruta
 * encaje, asi que las rutas mas especificas van antes que las mas generales
 * (`/posts/calendar` antes que `/posts`).
 */
export const RECORRIDOS: RecorridoAyuda[] = [
  recorridoDashboard,
  recorridoContactos,
  recorridoCampanas,
  recorridoMensajes,
  recorridoEntrantes,
  recorridoConsentimiento,
  recorridoPlantillas,
  recorridoConfiguracion,
];

/** Busca el recorrido que corresponde a una ruta. */
export function recorridoDeRuta(ruta: string | null): RecorridoAyuda | null {
  if (!ruta) return null;

  // Coincidencia exacta primero: evita que "/posts" se lleve "/posts/calendar".
  const exacto = RECORRIDOS.find((r) => r.ruta === ruta);
  if (exacto) return exacto;

  return (
    RECORRIDOS.find((r) => r.ruta !== "/" && ruta.startsWith(r.ruta)) ?? null
  );
}
