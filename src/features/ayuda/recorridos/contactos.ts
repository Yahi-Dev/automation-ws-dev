// src/features/ayuda/recorridos/contactos.ts
//
// Recorrido guiado de la pantalla de Contactos.
//
// El paso delicado es la importacion. Subir una lista comprada o sacada de
// cualquier sitio es lo que hace que WhatsApp bloquee el numero, asi que la
// explicacion se parte en dos pasos: uno para lo que hace el boton y otro,
// aparte y sin prisa, para el permiso. Se cuenta como una proteccion para ella,
// no como un tramite.
//
// El buscador, el boton de agregar y la tabla viven en el componente compartido
// DataTable, por eso sus selectores son los `data-tour` genericos `tabla-*`.
import type { RecorridoAyuda } from "../tipos";

export const recorridoContactos: RecorridoAyuda = {
  ruta: "/contacts",
  nombre: "Contactos",
  resumen:
    "Tu libreta: la gente a la que le puedes escribir y el permiso de cada uno.",
  pasos: [
    {
      // Sin elemento: sale centrado, es la bienvenida.
      titulo: "Bienvenida a tu libreta de contactos",
      descripcion:
        "Esta es la lista de las personas a las que les puedes escribir.<br>Aquí están sus nombres y sus números, guardados para siempre.<br>Lo que anotes aquí no lo tienes que volver a escribir nunca más. Vamos a ver qué hace cada botón.",
    },
    {
      elemento: '[data-tour="tabla-buscador"]',
      titulo: "Para buscar a una persona",
      descripcion:
        "Escribe aquí un nombre o un número y la lista se va achicando sola hasta dejar solo lo que buscas. No tienes que pulsar nada más. Borra lo que escribiste y vuelven a salir todos.",
      lado: "bottom",
    },
    {
      elemento: '[data-tour="tabla-boton-crear"]',
      titulo: "Agregar una persona a mano",
      descripcion:
        "Pulsa aquí para anotar a alguien nuevo. Se abre una pantalla donde pones su nombre, su país y su número de teléfono. Al guardar, esa persona aparece de una vez en esta lista.",
      lado: "bottom",
    },
    {
      elemento: '[data-tour="importar-contactos"]',
      titulo: "Subir una lista entera",
      descripcion:
        "Pulsa aquí para subir un archivo de Excel o CSV con muchas personas de golpe. La aplicación las añade sola, sin que las escribas una por una. Las que ya estaban no se repiten: se quedan como están.",
      lado: "bottom",
    },
    {
      elemento: '[data-tour="importar-contactos"]',
      titulo: "De dónde salió esa lista",
      descripcion:
        "La aplicación te va a preguntar de dónde salieron esas personas y si ellas aceptaron recibir tus mensajes.<br>No es papeleo, es para cuidarte: si la gente reporta tus mensajes como no deseados, WhatsApp te bloquea el número y te quedas sin poder escribirle a nadie.",
      lado: "bottom",
    },
    {
      elemento: '[data-tour="tabla-datos"]',
      titulo: "La lista y el permiso de cada uno",
      descripcion:
        "Cada línea es una persona. Mira la columna <strong>Consentimiento</strong>:<ul><li><strong>Suscrito</strong>: te dio permiso, le puedes escribir.</li><li><strong>Baja</strong>: pidió que no le escribas más.</li><li><strong>Desconocido</strong>: todavía no te ha dicho que sí.</li></ul>",
      lado: "top",
    },
    {
      elemento: '[data-tour="acciones-contacto"]',
      titulo: "Los tres puntitos de cada línea",
      descripcion:
        "Pulsa y se abre un menú pequeño:<ul><li><strong>Editar</strong>: corregir el nombre o el número.</li><li><strong>Suscribir</strong> o <strong>Dar de baja</strong>: cambiar el permiso.</li><li><strong>Eliminar</strong>: borrarlo para siempre. Si ya le escribiste antes, no te deja.</li></ul>",
      lado: "left",
    },
    {
      // Sin elemento: cierre centrado.
      titulo: "Un consejo antes de irte",
      descripcion:
        "Date una vuelta por esta lista antes de cualquier envío. Un número mal escrito es un mensaje que no llega y que igual te cobran. Vale más una lista corta y bien puesta que una larga y llena de errores.",
    },
  ],
};
