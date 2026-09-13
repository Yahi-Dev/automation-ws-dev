// src/lib/cron-auth.ts
//
// De donde se saca el secreto con el que el reloj externo se identifica.
//
// Vive fuera de la ruta porque los archivos `route.ts` de Next solo pueden
// exportar los manejadores (GET, POST...) y su configuracion: cualquier otra
// exportacion no se puede importar desde una prueba. Y esto es justo lo que hay
// que probar, porque si deja de reconocer la cabecera, las campanas programadas
// dejan de salir y nadie recibe ningun aviso.
import type { NextRequest } from "next/server";

/**
 * Se admiten DOS sitios, y el orden importa:
 *
 *  1. `Authorization: Bearer <secreto>` — el bueno. Una cabecera no se queda
 *     escrita en los registros del servidor, ni en los del proxy, ni en el
 *     historial de nadie.
 *  2. `?token=<secreto>` — el de antes. Se conserva porque puede haber algo ya
 *     configurado con esa forma, y quitarlo apagaria las campanas programadas
 *     en silencio. Un secreto en la direccion se copia en cada registro por el
 *     que pasa la peticion.
 *
 * Devuelve null cuando no viene por ninguno de los dos. Aqui NO se compara
 * nada: la comparacion se hace en la ruta, y en tiempo constante.
 */
export function secretoDeLaPeticion(req: NextRequest): string | null {
  const cabecera = req.headers.get("authorization") ?? "";

  // `Bearer`, `bearer`, `BEARER`: la norma dice que el esquema no distingue
  // mayusculas, y un reloj que lo escriba de otra forma no tiene por que
  // quedarse fuera.
  if (cabecera.toLowerCase().startsWith("bearer ")) {
    const valor = cabecera.slice(7).trim();
    if (valor) return valor;
  }

  return req.nextUrl.searchParams.get("token");
}
