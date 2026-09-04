// src/features/ayuda/recorridos/campanas.ts
//
// Recorrido guiado de la pantalla de Campañas (en el código, "posts").
//
// Es la pantalla donde se escribe el mensaje, pero NO donde se envía. Por eso
// el recorrido insiste en dos cosas: que crear no manda nada, y que cada
// mensaje enviado se cobra.
import type { RecorridoAyuda } from "../tipos";

export const recorridoCampanas: RecorridoAyuda = {
  ruta: "/posts",
  nombre: "Campañas",
  resumen: "Aquí escribes el mensaje que le vas a mandar a mucha gente de una vez.",
  pasos: [
    {
      titulo: "Esto son tus campañas",
      descripcion:
        "Una campaña es un mensaje que le llega a mucha gente a la vez.<br>Abajo está la lista de todas las que ya escribiste.<br><strong>Escribir una campaña no la manda.</strong> Mandarla es otro paso, y aquí te lo voy explicando.",
    },
    {
      elemento: '[data-tour="tabla-boton-crear"]',
      titulo: "Escribir una campaña nueva",
      descripcion:
        "El botón dice <strong>Nuevo Post</strong>. Púlsalo y se abre una pantalla para escribir el mensaje.<br>Pones el texto, la fecha y, si quieres, una foto.<br>Al guardarlo aparece en esta lista. Todavía no le llega a nadie: solo queda guardado.",
      lado: "bottom",
      alineacion: "end",
    },
    {
      elemento: '[data-tour="campana-fecha"]',
      titulo: "El día y la hora que le pusiste",
      descripcion:
        "Esta es la fecha que elegiste al escribir la campaña.<br>Si ya pasó, verás la palabra <strong>Expirado</strong>. No es un error ni se rompió nada: solo te avisa que esa fecha se quedó atrás.",
      lado: "right",
    },
    {
      elemento: '[data-tour="campana-texto"]',
      titulo: "Lo que la gente va a leer",
      descripcion:
        "Este es el mensaje tal como le va a llegar a cada persona.<br>Si es largo se corta con puntitos. Pon el ratón encima, sin pulsar, y lo ves completo.",
      lado: "bottom",
    },
    {
      elemento: '[data-tour="tabla-buscador"]',
      titulo: "Buscar una campaña vieja",
      descripcion:
        "Escribe aquí una palabra que recuerdes del mensaje.<br>La lista se va achicando sola y te deja solo las campañas que la tienen. Borra lo que escribiste y vuelven a salir todas.",
      lado: "bottom",
      alineacion: "start",
    },
    {
      elemento: '[data-tour="campana-acciones"]',
      titulo: "Los tres puntitos de cada renglón",
      descripcion:
        "Cada campaña tiene sus tres puntitos a la derecha. Púlsalos y se abre un menú pequeño.<br>Desde ahí puedes verla completa, mandarla o borrarla. Nada se hace solo: tú decides.",
      lado: "left",
    },
    {
      elemento: '[data-tour="campana-acciones"]',
      titulo: "La opción Enviar campaña",
      descripcion:
        "Dentro de ese menú está <strong>Enviar campaña</strong>. Ese es el botón que manda los mensajes de verdad.<br>Si lo ves apagado y no lo puedes pulsar, es porque todavía no dijiste a quién se le manda.",
      lado: "left",
    },
    {
      elemento: 'a[href="/messages"]',
      titulo: "El paso que falta: decir a quién",
      descripcion:
        "Antes de enviar tienes que entrar aquí, en <strong>Mensajes</strong>, y escoger las personas que van a recibir esa campaña.<br>Sin ese paso, el botón de enviar no hace nada. Es lo que más se olvida.",
      lado: "right",
    },
    {
      titulo: "Enviar cuesta dinero",
      descripcion:
        "Cada mensaje que sale se te cobra. Si son cien personas, se cobran cien mensajes.<br>Y no hay vuelta atrás: lo que sale no se puede recoger.<br>Por eso, antes de pulsar enviar, léelo con calma una vez más.",
    },
  ],
};
