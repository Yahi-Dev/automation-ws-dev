// src/features/ayuda/recorridos/plantillas.ts
//
// Recorrido guiado de la pantalla de plantillas.
//
// Es la pantalla mas dificil de entender para alguien que nunca ha usado
// WhatsApp para negocios: no basta con escribir el mensaje, hay que esperar a
// que WhatsApp lo apruebe. Por eso los pasos insisten tanto en la espera y en
// que un rechazo no rompe nada.
//
// La lista y el buscador vienen del componente compartido DataTable, por eso
// usan los `data-tour` genericos `tabla-datos` y `tabla-buscador`, en vez de
// selectores por el texto del recuadro de busqueda, que cambia sin avisar.
import type { RecorridoAyuda } from "../tipos";

export const recorridoPlantillas: RecorridoAyuda = {
  ruta: "/plantillas",
  nombre: "Plantillas",
  resumen:
    "Los mensajes que WhatsApp tiene que aprobar antes de que puedas escribirle a alguien.",
  pasos: [
    {
      // Sin elemento: sale centrado, es la bienvenida.
      titulo: "Esto son tus plantillas",
      descripcion:
        "Una plantilla es un mensaje que dejas escrito de antemano.<br>WhatsApp <strong>obliga</strong> a usar una plantilla cuando tú escribes primero, antes de que la persona te haya contestado.<br>En esta pantalla ves todas las tuyas y cómo va cada una.",
    },
    {
      elemento: '[data-tour="tabla-datos"]',
      titulo: "Tu lista de plantillas",
      descripcion:
        "Aquí aparecen todas tus plantillas, una por línea. Ves el nombre que le pusiste, para qué sirve, el idioma y el día que la creaste. Si esta lista sale vacía, todavía no has creado ninguna.",
      lado: "top",
    },
    {
      elemento: '[data-tour="tabla-buscador"]',
      titulo: "Buscar una plantilla",
      descripcion:
        "Escribe aquí una palabra y la lista se va achicando sola, hasta dejar solo las plantillas que la tienen. Borra lo que escribiste y vuelven a salir todas. No se borra nada, solo se esconde un rato.",
      lado: "bottom",
    },
    {
      elemento: '[data-tour="estado-plantilla"]',
      titulo: "Cómo saber si ya puedes usarla",
      descripcion:
        "Esta palabrita te dice cómo va cada plantilla:<ul><li><strong>Creada</strong>: la escribiste, pero todavía no la has mandado a revisar.</li><li><strong>Pendiente</strong>: WhatsApp la está revisando. Toca esperar.</li><li><strong>Aprobada</strong>: lista, ya puedes enviarla.</li><li><strong>Rechazada</strong>: WhatsApp no la aceptó.</li></ul>",
      lado: "right",
    },
    {
      elemento: '[data-tour="acciones-plantilla"]',
      titulo: "Los tres puntitos",
      descripcion:
        "Pulsa aquí y se abre un menú pequeño con dos opciones. Desde ahí mandas la plantilla a que WhatsApp la revise, o le preguntas a WhatsApp cómo va esa revisión. Tranquila: esto no le envía mensajes a nadie.",
      lado: "left",
    },
    {
      elemento: '[data-tour="acciones-plantilla"]',
      titulo: "Mandarla a revisar y esperar",
      descripcion:
        "Al mandarla a revisar te pide un nombre corto y para qué sirve el mensaje. Después queda <strong>Pendiente</strong>. WhatsApp puede tardar desde unos minutos hasta un día entero. Hasta que no salga <strong>Aprobada</strong>, esa plantilla no se puede enviar.",
      lado: "left",
    },
    {
      titulo: "Si te sale Rechazada",
      descripcion:
        "No es culpa tuya y no se daña nada. Casi siempre pasa porque el texto suena demasiado a publicidad. Cambia las palabras, escríbela más sencilla, como un aviso, y mándala a revisar otra vez. Puedes intentarlo las veces que haga falta.",
    },
    {
      titulo: "En resumen",
      descripcion:
        "Primero creas la plantilla. Después la mandas a revisar. Esperas a que salga <strong>Aprobada</strong>. Y ahí ya la puedes usar para escribirle a tus contactos. Si te pierdes, pulsa el botón verde de abajo y te lo explico de nuevo.",
    },
  ],
};
