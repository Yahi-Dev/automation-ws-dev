// src/features/ayuda/tipos.ts
//
// Tipos del manual guiado (driver.js).
//
// La app la va a usar una persona mayor sin experiencia tecnica, asi que la
// ayuda no es un PDF aparte: vive dentro de la propia pantalla y senala con el
// dedo donde hay que pulsar.

/** Un paso del recorrido: que se resalta y que se explica. */
export type PasoAyuda = {
  /**
   * Selector CSS del elemento a resaltar.
   *
   * Se prefieren selectores ESTABLES que ya existen en el marcado
   * (`a[href="/contacts"]`, `[data-tour="..."]`) frente a clases de Tailwind,
   * que cambian en cuanto alguien retoca el diseno.
   *
   * Si se omite, el paso sale centrado en la pantalla, sin resaltar nada: sirve
   * para la bienvenida y para el cierre.
   */
  elemento?: string;
  titulo: string;
  /** Admite HTML sencillo (<strong>, <br>, <ul>). */
  descripcion: string;
  /** Lado por el que aparece el globo. Por defecto driver.js lo decide solo. */
  lado?: "top" | "right" | "bottom" | "left";
  alineacion?: "start" | "center" | "end";
};

/** El recorrido completo de una pantalla. */
export type RecorridoAyuda = {
  /** Ruta exacta o prefijo de ruta al que pertenece (ej. "/contacts"). */
  ruta: string;
  /** Nombre corto, para el boton y el registro de "ya visto". */
  nombre: string;
  /** Frase de una linea que resume para que sirve la pantalla. */
  resumen: string;
  /**
   * Marca la pantalla como reservada al administrador.
   *
   * Sirve para NO ofrecer en el indice del manual pantallas en las que esa
   * persona no puede entrar: pulsar una entrada que acaba en "no tienes
   * permiso" (o en una redireccion al inicio) hace que el manual parezca roto,
   * y quien lo usa da por hecho que se equivoco ella. Es solo un filtro de lo
   * que se OFRECE; el permiso de verdad lo decide el servidor en cada pantalla.
   */
  soloAdmin?: boolean;
  pasos: PasoAyuda[];
};
