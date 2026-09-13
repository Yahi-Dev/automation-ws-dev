// src/features/ayuda/recorridos/entrantes.ts
//
// Recorrido guiado de la pantalla de mensajes entrantes.
//
// Es la pantalla que protege el numero de WhatsApp: si alguien pide que no le
// escriban mas, aqui queda apuntado. Y desde que existe el boton Responder, es
// tambien el UNICO sitio desde el que se puede contestar: el numero que se
// registra en Twilio deja de funcionar en la aplicacion normal de WhatsApp.
// Por eso el tono no es de tramite, sino de "esto te conviene mirarlo".
import type { RecorridoAyuda } from "../tipos";

export const recorridoEntrantes: RecorridoAyuda = {
  ruta: "/entrantes",
  nombre: "Entrantes",
  resumen:
    "Aquí lees lo que te responden y desde aquí le contestas a la persona.",
  pasos: [
    {
      titulo: "Aquí llega lo que te responden",
      descripcion:
        "Cuando le escribes a alguien, esa persona puede contestarte. Todo lo que te contestan aparece en esta pantalla, solo. Es la pantalla que cuida tu número: si alguien te pide que no le escribas más, aquí lo ves.",
    },
    {
      titulo: "Y es el único sitio donde puedes contestar",
      descripcion:
        "Esto es importante: el número de WhatsApp de la app <strong>no se puede abrir desde el móvil</strong>. No lo vas a ver en tu WhatsApp ni en WhatsApp Business. Es el precio de poder mandar mensajes a mucha gente a la vez. Así que lo que te escriban se lee aquí, y se contesta aquí.",
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
      elemento: '[data-tour="entrantes-responder"]',
      titulo: "Este es el botón para contestarle",
      descripcion:
        "Pulsa <strong>Responder</strong> y se abre la conversación completa con esa persona, como un chat normal de WhatsApp. Arriba ves todo lo que os habéis dicho y abajo tienes una caja para escribir. Escribes, pulsas <strong>Enviar respuesta</strong>, y le llega a su WhatsApp en unos segundos.",
      lado: "left",
      alineacion: "center",
    },
    {
      titulo: "Tienes 24 horas para contestar. Ni una más",
      descripcion:
        "Esta es una regla de WhatsApp, no de la app, y no se puede saltar.<br><br>Cuando una persona te escribe, se abre un plazo de <strong>24 horas</strong> para contestarle con tus propias palabras. Pasado ese plazo, ya no se puede: para volver a escribirle tendrías que mandarle una campaña, o esperar a que te escriba otra vez.<br><br>Cuando abres la conversación, la app te dice arriba y con todas las letras cuánto tiempo te queda.",
    },
    {
      titulo: "Por eso el botón cambia de nombre",
      descripcion:
        "Si todavía estás a tiempo, el botón es verde y dice <strong>Responder</strong>.<br><br>Si el plazo ya pasó, se pone gris y dice <strong>Ver</strong>: puedes leer toda la conversación, pero no escribir. Así sabes de un vistazo a quién te da tiempo de contestar sin tener que abrir uno por uno.",
    },
    {
      titulo: "Sabrás si tu respuesta llegó",
      descripcion:
        "Debajo de cada mensaje que tú envías aparece qué pasó con él: <strong>Enviando…</strong>, <strong>Enviado</strong>, <strong>Entregado</strong> (le llegó al móvil), <strong>Leído</strong> (lo abrió) o <strong>No llegó</strong>. No tienes que preguntarle a nadie si le llegó: lo ves ahí.",
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
        "No tienes que borrar a nadie a mano. Cuando una persona responde <strong>BAJA</strong>, la app le quita el permiso al momento y deja de escribirle en los próximos envíos. Tú solo lo ves aquí, ya hecho.<br><br>A esa persona tampoco podrás contestarle desde la conversación: se lo prometiste al darla de baja. Si algún día vuelve a escribir <strong>ALTA</strong>, se da de alta sola y entonces sí.",
    },
    {
      elemento: '[data-tour="entrantes-desconocido"]',
      titulo: "Cuando el número no está en tu lista",
      descripcion:
        "Si te escribe un número que no tienes guardado, aquí dice <strong>Desconocido</strong>. No es un error. La app te lo muestra para que lo mires tú y decidas si esa persona te interesa o no. Aunque no lo tengas guardado, puedes contestarle igual.",
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
