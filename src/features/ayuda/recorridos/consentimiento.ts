// src/features/ayuda/recorridos/consentimiento.ts
//
// Recorrido guiado de la pantalla de consentimiento.
//
// No es papeleo: es el respaldo de quien usa la app. Si alguien reclama, aqui
// esta la fecha y la prueba de que dio permiso. El recorrido se cuenta asi.
import type { RecorridoAyuda } from "../tipos";

export const recorridoConsentimiento: RecorridoAyuda = {
  ruta: "/consentimiento",
  nombre: "Consentimiento",
  resumen:
    "Tu respaldo: quién te dio permiso para escribirle, cuándo y de dónde salió ese permiso.",
  pasos: [
    {
      titulo: "Esta pantalla es tu respaldo",
      descripcion:
        "Aquí queda apuntado quién te dio permiso para escribirle y quién te lo quitó. Si algún día alguien reclama y dice <strong>yo nunca acepté que me escribieran</strong>, aquí tienes la fecha y la prueba.",
    },
    {
      elemento: '[data-tour="consentimiento-encabezado"]',
      titulo: "Un historial que se guarda solo",
      descripcion:
        "Cada vez que alguien acepta, o pide que no le escribas más, la app lo apunta aquí con el día y la hora. Tú no tienes que escribir nada en esta pantalla. Solo mirarla cuando te haga falta.",
      lado: "bottom",
      alineacion: "start",
    },
    {
      elemento: '[data-tour="consentimiento-filtros"]',
      titulo: "Ver solo altas o solo bajas",
      descripcion:
        "Con estos botones eliges qué mirar. <strong>Alta</strong> es la gente que aceptó recibir tus mensajes. <strong>Baja</strong> es la que pidió que la dejaras tranquila. Pulsa <strong>Todos</strong> y vuelve a verse la lista completa.",
      lado: "bottom",
      alineacion: "start",
    },
    {
      elemento: '[data-tour="consentimiento-origen"]',
      titulo: "De dónde salió ese permiso",
      descripcion:
        "Pulsa aquí para ver solo los permisos de un origen. Puede venir de una respuesta de la propia persona, de cuando la apuntaste tú a mano, o del archivo de Excel que subiste.",
      lado: "bottom",
      alineacion: "start",
    },
    {
      elemento: '[data-tour="tabla-buscador"]',
      titulo: "Buscar a una persona",
      descripcion:
        "Si alguien te llama reclamando, escribe aquí su nombre o su número. La lista te deja solo lo suyo y ves enseguida qué día aceptó, o qué día pidió que no le escribieras más.",
      lado: "bottom",
      alineacion: "start",
    },
    {
      elemento: '[data-tour="tabla-datos"]',
      titulo: "Qué dice cada línea",
      descripcion:
        "Cada línea es un permiso dado o quitado. Ves el día y la hora, de quién se trata, si fue alta o baja, de dónde salió y quién lo apuntó. Si lo apuntó la propia persona, también lo dice.",
      lado: "top",
      alineacion: "center",
    },
    {
      elemento: '[data-tour="consentimiento-evidencia"]',
      titulo: "La prueba guardada",
      descripcion:
        "Aquí queda copiado lo que la persona escribió, o de dónde salió el permiso. Por eso, cuando subas una lista de contactos, apunta bien de dónde los sacaste: eso es lo que te respalda después.",
      lado: "left",
      alineacion: "center",
    },
    {
      elemento: '[data-tour="consentimiento-exportar"]',
      titulo: "Guardarlo en un archivo de Excel",
      descripcion:
        "El botón dice <strong>Exportar CSV</strong>, pero no te asustes: es un archivo que abre Excel. Pulsa aquí y se te descarga toda esta lista, para guardarla o mandarla por correo si alguien te la pide.",
      lado: "left",
      alineacion: "center",
    },
  ],
};

export default recorridoConsentimiento;
