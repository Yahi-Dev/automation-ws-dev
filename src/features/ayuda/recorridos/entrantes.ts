// src/features/ayuda/recorridos/entrantes.ts
//
// Recorrido guiado de la pantalla de mensajes entrantes.
//
// Es la pantalla que protege el numero de WhatsApp: si alguien pide que no le
// escriban mas, aqui queda apuntado. Por eso el tono no es de tramite, sino de
// "esto te conviene mirarlo".
import type { RecorridoAyuda } from "../tipos";

export const recorridoEntrantes: RecorridoAyuda = {
  ruta: "/entrantes",
  nombre: "Entrantes",
  resumen:
    "Aquí ves todo lo que la gente te responde y qué hizo la app con cada respuesta.",
  pasos: [
    {
      titulo: "Aquí llega lo que te responden",
      descripcion:
        "Cuando le escribes a alguien, esa persona puede contestarte. Todo lo que te contestan aparece en esta pantalla, solo. Es la pantalla que cuida tu número: si alguien te pide que no le escribas más, aquí lo ves.",
    },
    {
      elemento: '[data-tour="entrantes-encabezado"]',
      titulo: "No tienes que hacer nada para que se llene",
      descripcion:
        "Esta lista se llena sola. Cada vez que alguien te responde, la app lo anota aquí con el día y la hora. Tú no tienes que copiar nada ni apuntar nada en papel. Solo entra de vez en cuando y mira.",
      lado: "bottom",
      alineacion: "start",
    },
    {
      elemento: '[data-tour="entrantes-filtros"]',
      titulo: "Botones para ver solo una cosa",
      descripcion:
        "Pulsa <strong>Bajas</strong> y verás solo a quienes pidieron que no les escribas más. <strong>Altas</strong>, quienes dijeron que sí. <strong>Sin acción</strong>, los mensajes normales. <strong>Desconocidos</strong>, los números que no tienes guardados. Pulsa <strong>Todos</strong> para volver a ver la lista completa.",
      lado: "bottom",
      alineacion: "start",
    },
    {
      elemento: '[data-tour="tabla-buscador"]',
      titulo: "Buscar una respuesta",
      descripcion:
        "Escribe aquí un nombre, un número o una palabra del mensaje. La lista se achica sola y te deja solo lo que coincide. Borra lo que escribiste y vuelve a salir todo.",
      lado: "bottom",
      alineacion: "start",
    },
    {
      elemento: '[data-tour="tabla-datos"]',
      titulo: "Cada línea es una respuesta",
      descripcion:
        "De izquierda a derecha ves: el día y la hora en que llegó, el número desde el que escribieron, el nombre de la persona si la tienes guardada, y lo que te dijo.",
      lado: "top",
      alineacion: "center",
    },
    {
      elemento: '[data-tour="entrantes-accion"]',
      titulo: "Qué hizo la app con ese mensaje",
      descripcion:
        "Esta marca de color te dice qué pasó.<ul><li><strong>Baja</strong>: pidió que no le escribas más.</li><li><strong>Alta</strong>: aceptó que le escribas.</li><li><strong>Sin acción</strong>: fue un mensaje normal.</li><li><strong>Contacto desconocido</strong>: ese número no lo tienes guardado.</li></ul>",
      lado: "left",
      alineacion: "center",
    },
    {
      titulo: "Si alguien escribe BAJA, la app lo apunta sola",
      descripcion:
        "No tienes que borrar a nadie a mano. Cuando una persona responde <strong>BAJA</strong>, la app le quita el permiso al momento y deja de escribirle en los próximos envíos. Tú solo lo ves aquí, ya hecho.",
    },
    {
      elemento: '[data-tour="entrantes-desconocido"]',
      titulo: "Cuando el número no está en tu lista",
      descripcion:
        "Si te escribe un número que no tienes guardado, aquí dice <strong>Desconocido</strong>. No es un error. La app te lo muestra para que lo mires tú y decidas si esa persona te interesa o no.",
      lado: "right",
      alineacion: "center",
    },
    {
      elemento: '[data-tour="entrantes-vincular"]',
      titulo: "Ponerle nombre a un desconocido",
      descripcion:
        "Pulsa estos tres puntitos y elige <strong>Vincular a contacto</strong>. Sirve para unir ese mensaje con la persona que ya tienes guardada con ese mismo número. Si todavía no la tienes, créala primero en Contactos y vuelve aquí.",
      lado: "left",
      alineacion: "center",
    },
  ],
};

export default recorridoEntrantes;
