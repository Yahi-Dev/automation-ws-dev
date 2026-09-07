// src/features/ayuda/recorridos/usuarios.ts
//
// Recorrido guiado de la pantalla de usuarios (solo administradores).
//
// Aqui se decide quien entra en la app y con cuanto poder, asi que el recorrido
// insiste en dos cosas que se malentienden solas: que las contrasenas NO las
// inventa ni las reparte el administrador (cada persona elige la suya desde el
// correo de invitacion), y que dar el rol de admin no es un detalle.
//
// Ningun paso senala nada que viva dentro de un dialogo cerrado: driver.js se
// salta en silencio los elementos que no existen, y el dialogo de "Crear
// usuario" solo aparece al pulsar el boton. Eso se cuenta con pasos centrados.
import type { RecorridoAyuda } from "../tipos";

export const recorridoUsuarios: RecorridoAyuda = {
  ruta: "/usuarios",
  nombre: "Usuarios",
  resumen:
    "Aquí decides quién puede entrar en la aplicación y qué puede hacer cada persona.",
  soloAdmin: true,
  pasos: [
    {
      titulo: "Quién puede entrar aquí",
      descripcion:
        "Esta pantalla es la puerta de la aplicación. Aquí ves a todas las personas que pueden entrar, invitas a gente nueva y decides qué puede hacer cada una. Es una pantalla de encargado: solo la ves tú.",
    },
    {
      elemento: '[data-tour="usuarios-filtros"]',
      titulo: "Ver solo un grupo de personas",
      descripcion:
        "Con estos botones eliges a quién mirar. <strong>Pendientes</strong> es la gente que espera tu permiso, y es la que sale al entrar. <strong>Aprobados</strong>, quienes ya pueden usar la app. <strong>Rechazados</strong>, a quienes dijiste que no. Pulsa <strong>Todos</strong> y vuelve a verse la lista entera.",
      lado: "bottom",
      alineacion: "start",
    },
    {
      elemento: '[data-tour="usuarios-estado"]',
      titulo: "Qué significa cada color",
      descripcion:
        "Esta marca te dice cómo está cada persona.<ul><li><strong>Pendiente</strong> (naranja): pidió entrar, pero todavía no puede. Espera a que tú digas que sí.</li><li><strong>Aprobado</strong> (verde): ya entra y trabaja con normalidad.</li><li><strong>Rechazado</strong> (rojo): no puede entrar. No se borra, se queda ahí por si cambias de idea.</li></ul>",
      lado: "left",
      alineacion: "center",
    },
    {
      elemento: '[data-tour="usuarios-acciones"]',
      titulo: "Los tres puntitos: decidir sobre esa persona",
      descripcion:
        "Pulsa estos tres puntitos y se abre un menú con lo que puedes hacer con esa persona en concreto. <strong>Aprobar</strong> le abre la puerta. <strong>Rechazar</strong> se la cierra. Puedes cambiar de idea las veces que quieras: aprobar hoy a quien rechazaste ayer.",
      lado: "left",
      alineacion: "center",
    },
    {
      elemento: '[data-tour="usuarios-rol"]',
      titulo: "Usuario o admin: piénsalo dos veces",
      descripcion:
        "Aquí ves qué es cada persona. <strong>Usuario</strong> trabaja con los contactos y los envíos, y ya está. <strong>Admin</strong> puede hacer <strong>todo</strong> lo que puedes tú: borrar contactos, tocar la configuración del envío y dar o quitar permisos a los demás, incluido a ti. Dáselo solo a alguien de mucha confianza. Se cambia desde el menú de los tres puntitos, con <strong>Hacer admin</strong> o <strong>Quitar admin</strong>.",
      lado: "left",
      alineacion: "center",
    },
    {
      elemento: '[data-tour="tabla-buscador"]',
      titulo: "Buscar a una persona",
      descripcion:
        "Cuando la lista se hace larga, escribe aquí un nombre o un correo. La lista se achica sola y te deja solo lo que coincide. Borra lo que escribiste y vuelve a salir todo.",
      lado: "bottom",
      alineacion: "start",
    },
    {
      elemento: '[data-tour="tabla-boton-crear"]',
      titulo: "Invitar a alguien nuevo",
      descripcion:
        "Pulsa <strong>Crear usuario</strong> y se abre una ventanita que te pide solo dos cosas: el <strong>nombre</strong> de la persona y su <strong>correo</strong>. Luego pulsas <strong>Crear e invitar</strong> y ya está: la invitación sale sola hacia ese correo.",
      lado: "left",
      alineacion: "center",
    },
    {
      titulo: "Tú no inventas ninguna contraseña",
      descripcion:
        "Esto es lo más importante de esta pantalla. A esa persona le llega un correo con un botón, y <strong>ella misma elige su contraseña</strong> al pulsarlo.<br><br>Tú <strong>no</strong> tienes que inventarle una contraseña, ni apuntarla en un papel, ni decírsela por teléfono. Si alguien te pide que le pases su contraseña, es que algo va mal: dile que abra el correo de invitación.",
    },
    {
      titulo: "Si el correo no le llega",
      descripcion:
        "A veces el correo no sale, o se le va a la carpeta de correo no deseado. Cuando eso pasa, la app te avisa y te enseña en pantalla un <strong>enlace</strong> con un botón de <strong>Copiar enlace</strong>.<br><br>Pulsa ese botón y pásaselo por donde te sea cómodo: WhatsApp, otro correo, un papel. Al abrirlo elegirá su contraseña igual que antes. Ojo: ese enlace <strong>caduca y solo sirve una vez</strong>.",
    },
    {
      elemento: '[data-tour="usuarios-acciones"]',
      titulo: "Reenviar invitación",
      descripcion:
        "En ese mismo menú de los tres puntitos aparece a veces <strong>Reenviar invitación</strong>. Sirve para mandar el correo otra vez a quien <strong>todavía no ha entrado nunca</strong>, porque lo perdió o nunca le llegó.<br><br>Si a alguien no le sale esa opción, no es un fallo: es que esa persona ya entró y ya tiene su propia contraseña. Si la ha olvidado, la recupera ella desde la pantalla de entrada.",
      lado: "left",
      alineacion: "center",
    },
  ],
};

export default recorridoUsuarios;
