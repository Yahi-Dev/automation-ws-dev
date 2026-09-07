// src/features/ayuda/recorridos/campana-formulario.ts
//
// Recorridos guiados de los DOS formularios de campaña (en el código, "posts"):
// el de escribir una nueva y el de corregir una ya guardada.
//
// Estos dos no salen en el índice del manual (`fueraDelIndice`): a un
// formulario no se llega desde el índice, se llega pulsando un botón en la
// lista de campañas. Ofrecerlos sueltos llevaría a un formulario vacío y sin
// contexto. Su ayuda se pide con el botón flotante una vez dentro, y por eso
// el botón dice "Explicar" y no "¿Cómo funciona?": aquí no hace falta un
// repaso de la pantalla, hace falta que le digan QUÉ ESCRIBIR en cada casilla.
//
// Las tres cosas que los dos recorridos repiten, porque son las que cuestan
// dinero o disgustos: guardar no envía, la fecha tampoco envía, y cada mensaje
// que sale se paga y no se puede recoger.
import type { RecorridoAyuda } from "../tipos";

export const recorridoCampanaCrear: RecorridoAyuda = {
  ruta: "/posts/create",
  nombre: "Nueva campaña",
  resumen: "Cómo rellenar cada casilla para escribir un mensaje nuevo.",
  etiquetaBoton: "Explicar",
  fueraDelIndice: true,
  pasos: [
    {
      titulo: "Aquí escribes el mensaje",
      descripcion:
        "Esta pantalla se llama <strong>Crear Nuevo Post</strong>. Aquí escribes el mensaje que quieres mandar.<br>Tranquila: <strong>guardar no manda nada</strong>. El mensaje queda apuntado en la lista y ya decidirás después a quién se lo mandas.",
    },
    {
      elemento: '[data-tour="campana-crear-texto"]',
      titulo: "Escribe aquí el mensaje",
      descripcion:
        "Escribe el mensaje tal y como quieres que lo lea la gente, con su saludo y su despedida.<br>Lo que pongas aquí es lo que aparecerá en el teléfono de cada persona, palabra por palabra. Léelo despacio antes de seguir.",
      lado: "top",
    },
    {
      elemento: '[data-tour="campana-crear-contador"]',
      titulo: "Cuántas letras te quedan",
      descripcion:
        "Ese numerito cuenta las letras que llevas escritas. El tope son <strong>800</strong>.<br>Al llegar a 800 el teclado deja de escribir: no está roto, es que ya no cabe más. Si te pasa, acorta el mensaje.",
      lado: "top",
      alineacion: "end",
    },
    {
      elemento: '[data-tour="campana-crear-plantilla"]',
      titulo: "¿El mensaje lleva foto?",
      descripcion:
        "Aquí eliges entre dos opciones. Si el mensaje es solo texto, escoge <strong>twilio/text</strong>. Si además quieres mandar una foto, escoge <strong>twilio/media</strong>.<br>Son nombres feos, pero solo significan eso: sin foto o con foto.",
      lado: "bottom",
    },
    {
      elemento: '[data-tour="campana-crear-imagen"]',
      titulo: "La foto, si la quieres poner",
      descripcion:
        "Pulsa <strong>Seleccionar</strong> y busca la foto en tu ordenador. Solo entra <strong>una</strong> foto por mensaje y tiene que pesar menos de 5MB.<br>Si arriba escogiste solo texto, esta casilla está apagada y no hace falta tocarla.",
      lado: "top",
    },
    {
      elemento: '[data-tour="campana-crear-fecha"]',
      titulo: "El día y la hora",
      descripcion:
        "Pon el día y la hora que quieres para este mensaje. Tiene que ser una fecha que aún no haya llegado; si pones una pasada, te avisa en rojo.<br><strong>Poner la fecha tampoco manda el mensaje</strong>: es solo una nota.",
      lado: "bottom",
    },
    {
      elemento: '[data-tour="campana-crear-nombre"]',
      titulo: "El nombre corto se pone solo",
      descripcion:
        "Esta casilla se rellena sola con las primeras palabras de tu mensaje y no la puedes escribir. Sirve para que el programa distinga una campaña de otra por dentro.<br>Nadie que reciba el mensaje va a ver ese nombre.",
      lado: "bottom",
      alineacion: "start",
    },
    {
      elemento: '[data-tour="campana-crear-guardar"]',
      titulo: "Guardar el mensaje",
      descripcion:
        "El botón dice <strong>Crear Post</strong>. Al pulsarlo, el mensaje queda guardado en la lista de campañas.<br>Repito lo importante, porque asusta: <strong>esto no se lo manda a nadie</strong>. Todavía no ha salido ningún mensaje ni te han cobrado nada.",
      lado: "top",
    },
    {
      elemento: 'a[href="/messages"]',
      titulo: "Falta decir a quién",
      descripcion:
        "Cuando el mensaje esté guardado, entra aquí, en <strong>Mensajes</strong>, y escoge las personas que lo van a recibir. Ese es el paso que hace que salga de verdad.<br>Es lo que más se olvida, así que apúntalo.",
      lado: "right",
    },
    {
      titulo: "Antes de mandar, dos avisos",
      descripcion:
        "Cada mensaje que sale <strong>cuesta dinero</strong>: si son cien personas, se pagan cien mensajes.<br>Y un mensaje enviado <strong>no se puede recoger</strong>. Por eso escribir aquí es gratis y tranquilo: léelo las veces que quieras antes de mandarlo.",
    },
  ],
};

export const recorridoCampanaEditar: RecorridoAyuda = {
  // El hueco entre corchetes es el número de la campaña: la pantalla real es
  // "/posts/7/edit". `recorridoDeRuta` sabe encajar ese hueco; sin eso, esta
  // pantalla se llevaría por prefijo la explicación de la lista "/posts".
  ruta: "/posts/[id]/edit",
  nombre: "Editar campaña",
  resumen: "Cómo corregir una campaña que ya habías guardado.",
  etiquetaBoton: "Explicar",
  fueraDelIndice: true,
  pasos: [
    {
      titulo: "Estás cambiando una campaña ya guardada",
      descripcion:
        "Esta pantalla dice <strong>Editar Post</strong>. Aquí retocas un mensaje que ya habías escrito antes.<br>Lo que cambies se guarda encima de lo anterior, así que lo viejo se pierde. Si prefieres conservarlo, escribe una campaña nueva en vez de esta.",
    },
    {
      elemento: '[data-tour="campana-editar-texto"]',
      titulo: "Cambia lo que dice el mensaje",
      descripcion:
        "Borra o añade lo que quieras: esto es lo que leerá cada persona.<br>Ojo con una cosa: si esta campaña ya se envió alguna vez, a quien la recibió no le cambia nada. Lo enviado se queda como estaba.",
      lado: "top",
    },
    {
      elemento: '[data-tour="campana-editar-contador"]',
      titulo: "Cuántas letras caben",
      descripcion:
        "El numerito te dice cuántas letras llevas. Aquí el tope son <strong>1000</strong>.<br>Cuando llegues al tope, el teclado deja de escribir. No está roto: es que ya no cabe más. Quita alguna frase y sigue.",
      lado: "top",
      alineacion: "end",
    },
    {
      elemento: '[data-tour="campana-editar-fecha"]',
      titulo: "Cambiar el día y la hora",
      descripcion:
        "Aquí ya aparece la fecha que habías puesto. Puedes cambiarla por otra, siempre que todavía no haya llegado.<br>Cambiar esta fecha <strong>no manda el mensaje</strong>; solo corrige la nota del día que tenías apuntado.",
      lado: "bottom",
    },
    {
      elemento: '[data-tour="campana-editar-imagen"]',
      titulo: "La foto: cambiarla o quitarla",
      descripcion:
        "Si la campaña ya tenía foto, la ves aquí debajo. Pulsa <strong>Reemplazar</strong> para poner otra.<br>Para quitarla, acerca el ratón a la foto y pulsa la crucecita de la esquina. Solo cabe una foto y menos de 5MB.",
      lado: "top",
    },
    {
      elemento: '[data-tour="campana-editar-guardar"]',
      titulo: "Guardar los cambios",
      descripcion:
        "El botón dice <strong>Actualizar Post</strong>. Al pulsarlo se guardan los cambios y vuelves a la lista de campañas.<br>Guardar <strong>no manda nada</strong>: el mensaje sigue esperando a que tú digas a quién se le envía.",
      lado: "top",
    },
    {
      elemento: '[data-tour="campana-editar-cancelar"]',
      titulo: "Salir sin cambiar nada",
      descripcion:
        "Si te arrepientes, pulsa <strong>Cancelar</strong>. Vuelves a la lista y la campaña se queda exactamente como estaba.<br>Nada de lo que hayas escrito en esta pantalla se guarda si sales por aquí. Es la salida tranquila.",
      lado: "top",
    },
    {
      elemento: 'a[href="/messages"]',
      titulo: "Para que llegue, falta un paso",
      descripcion:
        "Por muy bien que quede el mensaje, aquí no sale hacia ningún teléfono.<br>Entra en <strong>Mensajes</strong> y escoge a las personas que lo van a recibir. Ese es el único sitio desde donde se manda de verdad.",
      lado: "right",
    },
    {
      titulo: "Recuerda el coste",
      descripcion:
        "Corregir y guardar aquí es gratis, todas las veces que quieras.<br>Lo que cuesta dinero es enviar: cada mensaje que sale se paga, y una vez enviado <strong>ya no se puede recoger</strong>. Así que revisa con calma antes de mandar.",
    },
  ],
};
