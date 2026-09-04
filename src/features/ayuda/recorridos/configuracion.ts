// src/features/ayuda/recorridos/configuracion.ts
//
// Recorrido guiado de la pantalla de configuracion.
//
// Es la pantalla mas delicada de la app: aqui se puede dejar el envio sin
// funcionar, o peor, apagar la exigencia de permiso y conseguir que WhatsApp
// bloquee el numero. Por eso el recorrido repite dos ideas: se toca una sola
// vez, y el interruptor de permiso se queda encendido.
import type { RecorridoAyuda } from "../tipos";

export const recorridoConfiguracion: RecorridoAyuda = {
  ruta: "/configuracion",
  nombre: "Configuración",
  resumen:
    "Las claves de tu cuenta de envío y la velocidad con la que salen los mensajes.",
  pasos: [
    {
      // Sin elemento: sale centrado, es la bienvenida.
      titulo: "Esta es la pantalla de Configuración",
      descripcion:
        "Esta pantalla se llena <strong>una sola vez</strong>, casi siempre el día que se instala la aplicación. Después no hay que volver a tocarla.<br>Si un día los mensajes dejan de salir, este es el primer sitio donde mirar, con calma.",
    },
    {
      elemento: '[data-tour="claves-cuenta"]',
      titulo: "Las claves de tu cuenta",
      descripcion:
        "Aquí van los datos de la cuenta que envía los mensajes por ti. Son como el usuario y la contraseña de esa cuenta. No se los des a nadie. Si ya están bien puestos, no hay que tocarlos más.",
      lado: "bottom",
    },
    {
      elemento: '[data-tour="clave-secreta"]',
      titulo: "Por qué este recuadro sale vacío",
      descripcion:
        "Las contraseñas <strong>nunca</strong> se muestran, ni siquiera a ti. Por eso este recuadro sale vacío o con puntitos.<br><strong>Eso no quiere decir que se borraron.</strong> Siguen ahí guardadas. Solo escribes algo aquí si quieres cambiarlas por unas nuevas.",
      lado: "bottom",
    },
    {
      elemento: '[data-tour="tamano-lote"]',
      titulo: "Cuántos mensajes salen juntos",
      descripcion:
        "Este número dice cuántos mensajes se mandan de una vez, antes de que la aplicación tome un respiro. Diez está bien. Si pones un número muy alto, WhatsApp puede pensar que estás molestando y frenarte.",
      lado: "bottom",
    },
    {
      elemento: '[data-tour="pausa-mensajes"]',
      titulo: "El descanso entre un mensaje y otro",
      descripcion:
        "Aquí pones cuánto espera la aplicación entre un mensaje y el siguiente. Se mide en milésimas de segundo: mil es un segundo. Mientras más despacio, más seguro. Ir muy rápido es justo lo que trae problemas.",
      lado: "bottom",
    },
    {
      elemento: '[data-tour="permiso-obligatorio"]',
      titulo: "Este interruptor se queda encendido",
      descripcion:
        "Encendido quiere decir que la aplicación solo le escribe a la gente que te dio permiso.<br><strong>Déjalo siempre encendido.</strong> Apagarlo es lo que hace que WhatsApp bloquee tu número y te quedes sin poder enviar nada.",
      lado: "top",
    },
    {
      elemento: '[data-tour="probar-conexion"]',
      titulo: "Probar la conexión",
      descripcion:
        "Pulsa aquí y la aplicación le pregunta a tu cuenta de envío si todo está en orden. No manda ningún mensaje y no te cuesta dinero. Sale un aviso verde si va bien, o rojo si falta algo.",
      lado: "top",
    },
    {
      elemento: '[data-tour="guardar-configuracion"]',
      titulo: "Guardar los cambios",
      descripcion:
        "Si no pulsas este botón, lo que escribiste se pierde al salir de la pantalla. Al pulsarlo, las contraseñas se guardan protegidas y los recuadros vuelven a salir vacíos. Eso es normal, no te asustes.",
      lado: "top",
    },
    {
      titulo: "Un consejo antes de irte",
      descripcion:
        "Si algo deja de funcionar, mira aquí primero, pero <strong>no cambies cosas al azar</strong>. Prueba la conexión y lee el aviso que sale. Si no entiendes lo que dice, es mejor pedir ayuda que borrar datos.",
    },
  ],
};
