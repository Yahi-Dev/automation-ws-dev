// src/features/ayuda/recorridos/contacto-formulario.ts
//
// Los dos formularios de contacto: anotar a alguien nuevo y corregir a alguien
// que ya estaba.
//
// Por que van juntos en un archivo: son la misma casilla explicada dos veces, y
// separarlos garantizaba que un dia se contaran distinto. Los pasos si estan
// duplicados a proposito, porque lo que hay que decir cambia: al crear se
// explica QUE ESCRIBIR; al editar se explica QUE PASA SI LO CAMBIAS (y que el
// telefono se bloquea en cuanto hay mensajes enviados).
//
// El punto que se repite en los dos, y el unico que de verdad importa: el
// telefono necesita el codigo del pais. Ese error no se ve al guardar; se ve
// dias despues, cuando el envio falla y nadie sabe por que. Por eso tiene un
// paso propio en cada recorrido, ademas de la mencion en el paso del telefono.
//
// Los dos llevan `fueraDelIndice`: a un formulario se llega desde la lista de
// contactos, nunca desde el indice del manual, donde saldria vacio y sin
// contexto. Y `etiquetaBoton: "Explicar"`, porque aqui no se pide un repaso de
// la pantalla sino que le digan que poner en cada casilla.
import type { RecorridoAyuda } from "../tipos";

export const recorridoContactoCrear: RecorridoAyuda = {
  ruta: "/contacts/create",
  nombre: "Nuevo contacto",
  resumen: "Qué poner en cada casilla para anotar a una persona nueva.",
  etiquetaBoton: "Explicar",
  fueraDelIndice: true,
  pasos: [
    {
      // Sin elemento: sale centrado, es la bienvenida.
      titulo: "Vas a anotar a una persona nueva",
      descripcion:
        "Esta pantalla sirve para guardar a alguien en tu libreta. Son dos datos: cómo se llama y su número de teléfono. Cuando lo guardes, esa persona queda en la lista y ya le puedes escribir.",
    },
    {
      elemento: '[data-tour="contacto-nombre"]',
      titulo: "Cómo se llama la persona",
      descripcion:
        "Escribe el nombre tal y como quieres verlo después en tus mensajes. Si pones <strong>María</strong>, el mensaje saludará a María. Solo se admiten letras y espacios: los números y los signos no los deja escribir.",
      lado: "bottom",
    },
    {
      elemento: '[data-tour="contacto-telefono"]',
      titulo: "El número de teléfono",
      descripcion:
        "Aquí va el número de WhatsApp de esa persona, el mismo con el que usa la aplicación en su celular. Escríbelo sin puntos ni guiones. Si el número no tiene WhatsApp, el mensaje nunca le llegará.",
      lado: "bottom",
    },
    {
      elemento: '[data-tour="contacto-pais"]',
      titulo: "Primero la bandera del país",
      descripcion:
        "Pulsa la banderita y busca el país de esa persona. Al elegirlo se pone solo el código del país delante del número, por ejemplo <strong>+57</strong> para Colombia. Ese código es lo que hace que el mensaje encuentre el celular.",
      lado: "bottom",
    },
    {
      // Se vuelve a senalar el telefono a proposito: el aviso del codigo de pais
      // se cuenta aparte para que no se pierda dentro del paso anterior.
      elemento: '[data-tour="contacto-telefono"]',
      titulo: "Si el país está mal, no llega",
      descripcion:
        "Con calma: este es el fallo más común. Si eliges el país equivocado, el número queda mal y el envío fallará más adelante, sin decirte por qué. Comprueba la bandera y el número antes de guardar.",
      lado: "top",
    },
    {
      elemento: '[data-tour="contacto-cancelar"]',
      titulo: "Si te arrepientes",
      descripcion:
        "Este botón te devuelve a la lista sin guardar nada. Lo que hayas escrito se pierde, pero no se rompe nada. Úsalo con confianza cuando entres aquí sin querer.",
      lado: "top",
    },
    {
      elemento: '[data-tour="contacto-guardar"]',
      titulo: "Guardar la persona",
      descripcion:
        "Pulsa aquí y la persona queda anotada en tu libreta. No se le envía ningún mensaje ahora ni se cobra nada: guardar es gratis. Las casillas se quedan vacías para que anotes a la siguiente.",
      lado: "top",
    },
    {
      // Sin elemento: cierre centrado. En este formulario NO hay ninguna casilla
      // de WhatsApp ni de permiso, asi que se dice donde esta de verdad.
      titulo: "Falta el permiso para escribirle",
      descripcion:
        "Aquí no hay ninguna casilla de WhatsApp. El permiso se pone después, en la lista de contactos: busca a la persona, pulsa los tres puntitos y elige <strong>Suscribir</strong>. Sin ese permiso no conviene escribirle.",
    },
  ],
};

export const recorridoContactoEditar: RecorridoAyuda = {
  // Ruta con comodin: el navegador enseña "/contacts/7/edit", con el numero del
  // contacto en medio. `recorridoDeRuta` compara tramo a tramo y [id] vale por
  // uno cualquiera. Sin eso, esta pantalla se quedaria con la ayuda de la lista
  // de contactos, que gana por prefijo.
  ruta: "/contacts/[id]/edit",
  nombre: "Editar contacto",
  resumen: "Qué cambia y qué no cuando corriges los datos de una persona.",
  etiquetaBoton: "Explicar",
  fueraDelIndice: true,
  pasos: [
    {
      // Sin elemento: sale centrado, es la bienvenida.
      titulo: "Vas a corregir los datos de alguien",
      descripcion:
        "Esta pantalla es la misma persona que ya tenías anotada, para arreglar lo que esté mal escrito. Cambia lo que necesites y guarda. Si no guardas, todo se queda como estaba.",
    },
    {
      elemento: '[data-tour="contacto-editar-nombre"]',
      titulo: "El nombre de la persona",
      descripcion:
        "Aquí sale el nombre que guardaste. Bórralo y escríbelo bien si tiene una falta. Ojo: este nombre es el que aparece en los saludos de tus mensajes, así que cámbialo tal y como quieras leerlo.",
      lado: "bottom",
    },
    {
      elemento: '[data-tour="contacto-editar-telefono"]',
      titulo: "El número guardado",
      descripcion:
        "Este es el número al que le llegan los mensajes. Si te equivocaste de dígito, corrígelo aquí. Recuerda que tiene que ser el número donde esa persona usa WhatsApp en su celular.",
      lado: "bottom",
    },
    {
      elemento: '[data-tour="contacto-pais"]',
      titulo: "La bandera del país",
      descripcion:
        "La banderita lleva el código del país, por ejemplo <strong>+57</strong> para Colombia. Es la parte que más se equivoca. Si el país está mal, el mensaje no llega y el envío falla después sin explicación.",
      lado: "bottom",
    },
    {
      elemento: '[data-tour="contacto-editar-aviso-telefono"]',
      titulo: "A veces el número no se deja tocar",
      descripcion:
        "Si a esta persona ya le enviaste mensajes, la aplicación no te deja cambiarle el número: aquí abajo te lo avisa en rojo. Es para no desordenar el historial. En ese caso, anota a la persona como contacto nuevo.",
      lado: "top",
    },
    {
      elemento: '[data-tour="contacto-editar-cancelar"]',
      titulo: "Salir sin cambiar nada",
      descripcion:
        "Si prefieres dejarlo como estaba, pulsa Cancelar y vuelves a la lista. Nada de lo que hayas tocado en esta pantalla se guarda. Es la salida segura cuando dudas.",
      lado: "top",
    },
    {
      elemento: '[data-tour="contacto-editar-guardar"]',
      titulo: "Guardar los cambios",
      descripcion:
        "Pulsa aquí para que los cambios queden guardados. Los datos viejos se reemplazan por los nuevos y no se pueden recuperar, así que revisa el número antes. Después vuelves solo a la lista.",
      lado: "top",
    },
    {
      // Sin elemento: cierre centrado.
      titulo: "Una última cosa",
      descripcion:
        "Cambiar el nombre o el número no cambia el permiso de esa persona. Si te pidió que no le escribas más, eso se respeta desde la lista de contactos, con los tres puntitos y <strong>Dar de baja</strong>.",
    },
  ],
};
