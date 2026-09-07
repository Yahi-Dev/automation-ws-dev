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
import { recorridoUsuarios } from "./recorridos/usuarios";

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
  recorridoUsuarios,
];

/**
 * Rutas que solo tiene sentido ofrecer a un administrador.
 *
 * Por que una lista aqui y no solo el campo `soloAdmin` de cada recorrido: los
 * archivos de ./recorridos/ se escriben y se revisan por separado, asi que un
 * recorrido nuevo puede llegar sin declarar nada. Si el filtro dependiera solo
 * del campo, ese olvido se traduciria en una entrada del indice que lleva a una
 * pantalla que redirige al inicio, y quien usa el manual creeria que se
 * equivoco de sitio. La lista es la red de seguridad; el campo permite afinar
 * caso por caso. Se combinan: basta con que uno de los dos lo marque.
 */
const RUTAS_SOLO_ADMIN = ["/configuracion", "/usuarios"];

/**
 * Los recorridos que se pueden ofrecer en el indice del manual segun el rol.
 *
 * Ojo: esto NO es un control de acceso, es cortesia de interfaz. Quien decide
 * si se entra o no a una pantalla es el servidor; aqui solo se evita proponer
 * un camino cerrado.
 */
export function recorridosVisibles(rol?: string): RecorridoAyuda[] {
  if (rol === "admin") return RECORRIDOS;

  return RECORRIDOS.filter(
    (r) => !r.soloAdmin && !RUTAS_SOLO_ADMIN.includes(r.ruta)
  );
}

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
