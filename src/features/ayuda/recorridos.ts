// src/features/ayuda/recorridos.ts
//
// Registro de recorridos guiados, uno por pantalla.
//
// Los contenidos de cada pantalla viven en archivos separados dentro de
// ./recorridos/ para que se puedan escribir y revisar por separado.
import type { RecorridoAyuda } from "./tipos";
import { recorridoDashboard } from "./recorridos/dashboard";
import { recorridoContactos } from "./recorridos/contactos";
import {
  recorridoContactoCrear,
  recorridoContactoEditar,
} from "./recorridos/contacto-formulario";
import { recorridoCampanas } from "./recorridos/campanas";
import {
  recorridoCampanaCrear,
  recorridoCampanaEditar,
} from "./recorridos/campana-formulario";
import { recorridoMensajes } from "./recorridos/mensajes";
import { recorridoAsignar } from "./recorridos/asignar-formulario";
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
  // Antes que "/contacts", por la misma razon: "/contacts/create" tambien encaja
  // con "/contacts" en la busqueda por prefijo. El de editar ademas lleva
  // comodin ("/contacts/[id]/edit"), que se prueba antes que los prefijos.
  recorridoContactoCrear,
  recorridoContactoEditar,
  recorridoContactos,
  // Los dos formularios de campana van antes que "/posts" por lo mismo:
  // "/posts/create" tambien encaja con "/posts" en la busqueda por prefijo, y
  // el de editar ("/posts/[id]/edit") es un patron con comodin, que se prueba
  // antes que los prefijos.
  recorridoCampanaCrear,
  recorridoCampanaEditar,
  recorridoCampanas,
  // Antes que "/messages": aunque `recorridoDeRuta` prueba primero la
  // coincidencia exacta, la busqueda por prefijo se queda con el primero que
  // encaje, y "/messages" tambien encaja con "/messages/assign".
  recorridoAsignar,
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
  if (rol === "admin") return RECORRIDOS.filter((r) => !r.fueraDelIndice);

  return RECORRIDOS.filter(
    (r) => !r.fueraDelIndice && !r.soloAdmin && !RUTAS_SOLO_ADMIN.includes(r.ruta)
  );
}

/**
 * ¿La ruta del recorrido lleva un tramo con comodin, al estilo de Next?
 *
 * Las pantallas que trabajan sobre un registro concreto se escriben con
 * corchetes ("/contacts/[id]/edit"), porque el numero cambia en cada contacto.
 */
const esPatron = (ruta: string) => ruta.includes("[");

/**
 * Compara un patron con la ruta REAL del navegador, tramo a tramo.
 *
 * El navegador enseña "/contacts/7/edit", nunca "/contacts/[id]/edit", asi que
 * sin esto la pantalla de editar se quedaba con la ayuda de la lista de
 * contactos (que gana por prefijo) y quien pulsaba "Explicar" dentro del
 * formulario recibia la explicacion de otra pantalla.
 *
 * Un tramo entre corchetes vale por UNO cualquiera, ni mas ni menos: encaja con
 * "/contacts/7/edit" pero no con "/contacts/7/mensajes/edit".
 */
function encajaConPatron(patron: string, ruta: string): boolean {
  const tramosPatron = patron.split("/");
  const tramosRuta = ruta.split("/");
  if (tramosPatron.length !== tramosRuta.length) return false;

  return tramosPatron.every((tramo, i) =>
    tramo.startsWith("[") && tramo.endsWith("]")
      ? tramosRuta[i].length > 0
      : tramo === tramosRuta[i]
  );
}

/** Busca el recorrido que corresponde a una ruta. */
export function recorridoDeRuta(ruta: string | null): RecorridoAyuda | null {
  if (!ruta) return null;

  // Coincidencia exacta primero: evita que "/posts" se lleve "/posts/calendar".
  const exacto = RECORRIDOS.find((r) => r.ruta === ruta);
  if (exacto) return exacto;

  // Despues los patrones con comodin, SIEMPRE antes que los prefijos: son mas
  // concretos, y si se probaran al final "/contacts/7/edit" ya se lo habria
  // llevado "/contacts".
  const patron = RECORRIDOS.find(
    (r) => esPatron(r.ruta) && encajaConPatron(r.ruta, ruta)
  );
  if (patron) return patron;

  // Y por ultimo el prefijo de siempre, como estaba. Los patrones se descartan
  // aqui porque un pathname real nunca lleva corchetes: no encajarian nunca y
  // solo harian ruido.
  return (
    RECORRIDOS.find(
      (r) => r.ruta !== "/" && !esPatron(r.ruta) && ruta.startsWith(r.ruta)
    ) ?? null
  );
}
