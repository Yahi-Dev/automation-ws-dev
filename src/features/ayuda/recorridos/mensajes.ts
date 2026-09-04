// src/features/ayuda/recorridos/mensajes.ts
//
// Recorrido guiado de la pantalla de Mensajes.
//
// Cubre también la pantalla de asignar (/messages/assign), que cae en esta
// misma ruta: los pasos que señalan elementos de esa pantalla se saltan solos
// cuando no están, y se muestran cuando la persona está ahí dentro.
import type { RecorridoAyuda } from "../tipos";

export const recorridoMensajes: RecorridoAyuda = {
  ruta: "/messages",
  nombre: "Mensajes",
  resumen: "Aquí escoges a quién se le manda cada campaña y ves cómo le llegó.",
  pasos: [
    {
      titulo: "Esta es la pantalla de Mensajes",
      descripcion:
        "Esta pantalla no muestra campañas: muestra envíos.<br>Hay un renglón por cada mensaje y cada persona. Si una campaña va para treinta personas, aquí salen treinta renglones, uno por cada una.",
    },
    {
      elemento: '[data-tour="tabla-boton-crear"]',
      titulo: "Asignar Mensaje: el paso que todos se saltan",
      descripcion:
        "Pulsa aquí para juntar una campaña con las personas que la van a recibir.<br>Mientras no hagas esto, esa campaña no se le puede mandar a nadie. Es el paso que más se olvida.",
      lado: "bottom",
      alineacion: "end",
    },
    {
      elemento: '[data-tour="asignar-campana"]',
      titulo: "Primero: escoge la campaña",
      descripcion:
        "Ya dentro de asignar, esta es la parte de la izquierda.<br>Pulsa encima de la campaña que quieres mandar. Se le pone un borde azul para que veas cuál escogiste.",
      lado: "right",
    },
    {
      elemento: '[data-tour="asignar-personas"]',
      titulo: "Después: escoge a las personas",
      descripcion:
        "Aquí marcas la casilla de cada persona que va a recibir ese mensaje.<br>Si son todas, usa el botón <strong>Seleccionar todos</strong>. Y si buscas a alguien en concreto, escribe su nombre o su teléfono.",
      lado: "left",
    },
    {
      elemento: '[data-tour="asignar-guardar"]',
      titulo: "Guardar a quién se le manda",
      descripcion:
        "Este botón te dice a cuántas personas se va a asignar.<br>Al pulsarlo se guarda esa pareja: campaña y personas. <strong>Todavía no sale ningún mensaje ni se cobra nada.</strong> Eso se hace después en <strong>Posts</strong>, la pantalla de tus campañas.",
      lado: "top",
    },
    {
      elemento: '[data-tour="mensajes-filtros"]',
      titulo: "Ver solo lo que te interesa",
      descripcion:
        "Estos botones achican la lista.<br>Pulsa <strong>Pendientes</strong> y ves solo los que aún no han salido. Pulsa <strong>Fallidos</strong> y ves solo los que dieron problema. Con <strong>Todos</strong> vuelve la lista completa.",
      lado: "bottom",
      alineacion: "start",
    },
    {
      elemento: '[data-tour="tabla-buscador"]',
      titulo: "Buscar a una persona",
      descripcion:
        "Escribe aquí el nombre de alguien, o un pedazo del mensaje.<br>La lista se queda solo con lo que coincide. Es lo más rápido para saber si a doña María le llegó o no.",
      lado: "bottom",
      alineacion: "start",
    },
    {
      elemento: '[data-tour="mensaje-contacto"]',
      titulo: "A quién va ese mensaje",
      descripcion:
        "Aquí ves el nombre de la persona y su número de teléfono.<br>Si el número está mal escrito, el mensaje no le llega. El número se arregla en la pantalla de Contactos.",
      lado: "right",
    },
    {
      elemento: '[data-tour="mensaje-estado"]',
      titulo: "Cómo va cada mensaje",
      descripcion:
        "Esta etiqueta te dice en qué va cada uno:<ul><li><strong>Pendiente</strong>: todavía no ha salido.</li><li><strong>Enviado</strong>: ya salió de aquí.</li><li><strong>Entregado</strong>: llegó al teléfono.</li><li><strong>Leído</strong>: la persona lo abrió.</li></ul>",
      lado: "left",
    },
    {
      elemento: '[data-tour="mensaje-estado"]',
      titulo: "Cuando dice Fallido",
      descripcion:
        "<strong>Fallido</strong> quiere decir que ese mensaje no llegó.<br>A veces es el número, que está malo.<br>Y a veces esa persona pidió que no le escribieran más. Cuando es eso, la app no insiste: se respeta a propósito.",
      lado: "left",
    },
  ],
};
