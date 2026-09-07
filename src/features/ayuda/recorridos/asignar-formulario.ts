// src/features/ayuda/recorridos/asignar-formulario.ts
//
// Recorrido guiado de la pantalla de asignar destinatarios (/messages/assign).
//
// Es LA pantalla que la gente se salta. Escribir la campaña se entiende sola y
// pulsar "Enviar campaña" tambien; lo que no es evidente es que entre esas dos
// cosas hay que decir A QUIEN se le manda. Sin este paso la campaña existe pero
// no tiene ni un destinatario, el envio no hace nada visible y quien usa la app
// concluye que "esto no manda mensajes" y deja de usarla.
//
// Va fuera del indice del manual porque aqui se llega desde Mensajes, con el
// boton de asignar; ofrecerla suelta llevaria a un formulario sin contexto.
import type { RecorridoAyuda } from "../tipos";

export const recorridoAsignar: RecorridoAyuda = {
  ruta: "/messages/assign",
  nombre: "Elegir destinatarios",
  resumen: "Aquí le dices a la app a qué personas va dirigida una campaña.",
  etiquetaBoton: "Explicar",
  fueraDelIndice: true,
  pasos: [
    {
      titulo: "Aquí eliges a quién se le manda",
      descripcion:
        "En esta pantalla juntas dos cosas: una campaña que ya escribiste y las personas que la van a recibir.<br>Una campaña recién escrita no tiene destinatarios. Si te saltas esta pantalla, el botón de enviar no le manda nada a nadie.",
    },
    {
      elemento: '[data-tour="asignar-campana"]',
      titulo: "Primero: escoge la campaña",
      descripcion:
        "En esta columna están las campañas que tienes escritas. Pulsa encima de la que quieras mandar.<br>Se le pone un borde azul: ese borde es la señal de que la escogiste bien. Solo puedes escoger una cada vez.",
      lado: "right",
    },
    {
      elemento: '[data-tour="asignar-buscador"]',
      titulo: "Buscar a una persona",
      descripcion:
        "Si tu lista es larga, pulsa aquí y escribe el nombre o el teléfono de quien buscas.<br>Solo aparecen las personas que coinciden. Es lo más rápido cuando la campaña es para dos o tres y no quieres bajar toda la lista.",
      lado: "left",
    },
    {
      elemento: '[data-tour="asignar-lista-personas"]',
      titulo: "Después: marca a las personas",
      descripcion:
        "Aquí está tu gente. Pulsa la casilla cuadrada que hay al lado de un nombre y esa persona queda escogida.<br>Si te equivocaste, vuelve a pulsar la misma casilla y se desmarca. Puedes marcar todas las que quieras.",
      lado: "left",
    },
    {
      elemento: '[data-tour="asignar-todos"]',
      titulo: "Escoger a todos de una vez",
      descripcion:
        "Este botón marca de golpe a todas las personas de la lista. Úsalo cuando la campaña sea de verdad para todo el mundo.<br>Si lo pulsas otra vez se desmarcan todas y empiezas de nuevo. No pasa nada por probar.",
      lado: "bottom",
      alineacion: "end",
    },
    {
      elemento: '[data-tour="asignar-contador"]',
      titulo: "Cuántas llevas escogidas",
      descripcion:
        "Este renglón te dice cuántas personas llevas marcadas y cuántas tienes en total.<br>Míralo antes de guardar. Si dice cero, todavía no marcaste a nadie y el botón de abajo no te dejará continuar.",
      lado: "left",
    },
    {
      elemento: '[data-tour="asignar-guardar"]',
      titulo: "Guardar no es enviar",
      descripcion:
        "El botón te dice a cuántas personas se va a asignar. Al pulsarlo se guarda esa pareja: la campaña y su gente.<br><strong>Todavía no sale ningún mensaje, nadie recibe nada y no se gasta dinero.</strong>",
      lado: "top",
    },
    {
      titulo: "Las bajas se respetan solas",
      descripcion:
        "Si alguien pidió que no le escribieras más, la app lo aparta aunque tú lo hayas marcado, y te avisa de cuántos apartó.<br>No es un fallo, es a propósito: insistirle a quien pidió la baja es lo que hace que bloqueen tu número de WhatsApp.",
    },
    {
      titulo: "Y entonces, ¿cuándo se envía?",
      descripcion:
        "El envío se hace después, en la pantalla <strong>Posts</strong>, con el botón <strong>Enviar campaña</strong>.<br>Puedes volver aquí cuando quieras y añadir más personas a la misma campaña: a las que ya estaban no se les manda dos veces.",
    },
  ],
};
