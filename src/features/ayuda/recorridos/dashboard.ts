// src/features/ayuda/recorridos/dashboard.ts
//
// Recorrido guiado de la pantalla de Inicio.
//
// Es el PRIMER recorrido que ve la persona, asi que hace dos trabajos a la vez:
// explica los numeros del panel y sirve de plano de toda la aplicacion. Por eso
// recorre los enlaces del menu de la izquierda en el mismo orden en que se
// trabaja de verdad: guardar contactos, pedirles permiso, escribir el mensaje,
// elegir a quien, enviar y volver aqui a mirar como fue.
//
// Los selectores del menu son los propios enlaces (`a[href="/contacts"]`), que
// salen de data.navMain en src/components/app-sidebar.tsx. El menu se pinta
// ANTES que el contenido, asi que si en el panel hubiera otro enlace al mismo
// sitio (el "Ver todos" de contactos recientes), el primero que encuentra el
// navegador sigue siendo el del menu.
//
// OJO con el orden del envio, que es lo que mas se confunde: en Posts se
// escribe la campana, en Mensajes se dice a quien se le manda, y el envio de
// verdad se hace luego desde Posts, en "Enviar campana". Los pasos de esta
// pantalla lo cuentan igual que los recorridos de Campanas y de Mensajes.
import type { RecorridoAyuda } from "../tipos";

export const recorridoDashboard: RecorridoAyuda = {
  ruta: "/dashboard",
  nombre: "Inicio",
  resumen:
    "La pantalla de Inicio: mira como van tus mensajes y aprende donde esta cada cosa.",
  pasos: [
    {
      // Sin elemento: sale centrado, es la bienvenida.
      titulo: "Bienvenida a tu pantalla de Inicio",
      descripcion:
        "Aquí ves de un vistazo cómo van tus mensajes de WhatsApp.<br>Desde aquí no se envía nada: esta pantalla es solo para mirar.<br>Sigue esta guía y te enseño la aplicación entera, sitio por sitio.",
    },
    {
      elemento: '[data-tour="panel-metricas"]',
      titulo: "Los cuatro números de arriba",
      descripcion:
        "<ul><li><strong>Enviados</strong>: los mensajes que salieron.</li><li><strong>Entregados</strong>: llegaron al teléfono de la persona.</li><li><strong>Leídos</strong>: la persona los abrió.</li><li><strong>Fallidos</strong>: no llegaron. Casi siempre es un número mal escrito o alguien que ya no tiene WhatsApp.</li></ul>",
      lado: "bottom",
    },
    {
      elemento: '[data-tour="menu-lateral"]',
      titulo: "El menú de la izquierda",
      descripcion:
        "Todo se abre desde aquí.<br>El orden de trabajo es siempre el mismo: guardas la gente, les pides permiso, escribes lo que quieres decir, eliges a quién se lo mandas, lo envías y vuelves aquí a ver cómo fue.",
      lado: "right",
    },
    {
      elemento: 'a[href="/contacts"]',
      titulo: "Contactos: la gente",
      descripcion:
        "Aquí guardas a las personas a las que les vas a escribir: su nombre y su número. Puedes anotarlas una a una o subir una lista entera desde un archivo de Excel. Este es el primer sitio al que tienes que ir.",
      lado: "right",
    },
    {
      elemento: 'a[href="/consentimiento"]',
      titulo: "Consentimiento: el permiso",
      descripcion:
        "Cada persona tiene que haber dicho que sí antes de que le escribas. Aquí ves quién te dio permiso y quién pidió que no le escribas más. Esto te cuida: WhatsApp bloquea el número de quien manda mensajes que la gente no quiere.",
      lado: "right",
    },
    {
      elemento: 'a[href="/posts"]',
      titulo: "Campañas: lo que vas a decir",
      descripcion:
        "En el menú se llama <strong>Posts</strong>, pero es donde escribes tus campañas.<br>Redactas el mensaje con calma, le pones una foto si quieres, y lo guardas. Escribirlo aquí no manda nada todavía: solo lo dejas preparado.",
      lado: "right",
    },
    {
      elemento: 'a[href="/plantillas"]',
      titulo: "Plantillas: los textos que WhatsApp revisa",
      descripcion:
        "Cuando tú escribes primero, WhatsApp exige que ese texto lo hayan revisado y aprobado ellos. Esos textos aprobados se llaman plantillas y viven aquí. Si un envío no sale, lo primero que hay que mirar es si la plantilla ya está aprobada.",
      lado: "right",
    },
    {
      elemento: 'a[href="/messages"]',
      titulo: "Mensajes: a quién se le manda",
      descripcion:
        "Aquí escoges qué personas van a recibir cada campaña.<br>Guardar esa pareja todavía no envía nada ni te cuesta dinero. El envío de verdad se hace después en <strong>Posts</strong>, con la opción <strong>Enviar campaña</strong>.",
      lado: "right",
    },
    {
      elemento: 'a[href="/entrantes"]',
      titulo: "Entrantes: lo que te contestan",
      descripcion:
        "Cuando alguien te responde, su mensaje cae aquí. Entra de vez en cuando a leerlos. Si una persona escribe <strong>BAJA</strong>, la aplicación le quita el permiso sola y deja de escribirle. Tú solo lo ves aquí, ya hecho.",
      lado: "right",
    },
    {
      elemento: 'a[href="/configuracion"]',
      titulo: "Configuración: no hace falta tocarla",
      descripcion:
        "Aquí están los datos de la cuenta que conecta la aplicación con WhatsApp. Ya quedaron puestos y funcionando. Si se cambia algo sin saber, los mensajes dejan de salir. Mejor pide ayuda antes de tocar nada de aquí.",
      lado: "right",
    },
    {
      elemento: '[data-tour="panel-nuevo-mensaje"]',
      titulo: "Y para empezar ya",
      descripcion:
        "Este botón verde te lleva derecho a escoger quién recibe una campaña, sin dar vueltas por el menú.<br>Si te pierdes en cualquier momento, el botón redondo de abajo a la derecha te vuelve a abrir esta guía.",
      lado: "bottom",
    },
  ],
};
