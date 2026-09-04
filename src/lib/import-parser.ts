// src/lib/import-parser.ts
// Lector unico de archivos de importacion de contactos: CSV y Excel (.xlsx).
//
// Expone una sola funcion, `parseContactsFile`, con dos backends internos
// (papaparse para texto, exceljs para hojas de calculo) que devuelven
// EXACTAMENTE la misma forma. Asi el resto del pipeline de importacion no
// necesita saber que formato subio el usuario.
//
// El formato se detecta por MAGIC BYTES, nunca por la extension ni por
// `file.type`: los dos los controla el cliente y se falsifican en un segundo.
import Papa from "papaparse";

/** Fila ya normalizada: encabezado -> valor en texto. */
export type ImportRow = Record<string, string>;

/** Error asociado a una fila concreta del archivo (1 = primera fila del archivo). */
export type ImportError = { row: number; error: string };

export type ParsedImportFile = {
  rows: ImportRow[];
  errors: ImportError[];
};

/** Tope de errores de formato que se devuelven; mas alla es ruido. */
const MAX_ERRORES_FORMATO = 20;

// Firmas de archivo. Un .xlsx (y .xlsm) es un contenedor ZIP.
const FIRMA_ZIP = [0x50, 0x4b, 0x03, 0x04]; // "PK\x03\x04"
// Excel 97-2003 (.xls) es un contenedor OLE2, que exceljs NO sabe leer.
const FIRMA_OLE2 = [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1];

function empiezaPor(bytes: Uint8Array, firma: number[]): boolean {
  if (bytes.length < firma.length) return false;
  return firma.every((b, i) => bytes[i] === b);
}

type FormatoImportacion = "xlsx" | "xls" | "texto";

/** Decide el formato mirando los primeros bytes del archivo, no su nombre. */
function detectarFormato(bytes: Uint8Array): FormatoImportacion {
  if (empiezaPor(bytes, FIRMA_ZIP)) return "xlsx";
  if (empiezaPor(bytes, FIRMA_OLE2)) return "xls";
  return "texto";
}

/**
 * Decodifica el archivo como texto.
 *
 * Se intenta UTF-8 en modo estricto y, si falla, se cae a windows-1252: es la
 * codificacion que usa Excel en español al hacer "Guardar como CSV", y sin este
 * respaldo todos los acentos llegarian como caracteres de reemplazo.
 * El TextDecoder de UTF-8 ya descarta el BOM inicial por defecto.
 */
function decodificarTexto(bytes: Uint8Array): string {
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    return new TextDecoder("windows-1252").decode(bytes);
  }
}

/**
 * Convierte un numero de celda a texto SIN notacion exponencial.
 *
 * Aqui esta el fallo mas comun de una importacion real: Excel guarda un
 * telefono escrito como "+34600112233" o "0034600112233" como el NUMERO
 * 34600112233 / 34600112233, y al hacerlo pierde el "+" y los ceros a la
 * izquierda antes de que este codigo llegue a verlo. No hay forma de
 * recuperarlos del valor; lo unico que queda es:
 *
 *  1. No empeorarlo: `String(1e21)` devolveria "1e+21", que ya no es un
 *     telefono. Se fuerza siempre la representacion decimal.
 *  2. Recuperar los ceros cuando Excel los guardo en el FORMATO de la celda
 *     (numFmt "000000000"): en ese caso el usuario SI escribio los ceros y
 *     Excel los recuerda aparte del valor.
 *
 * Lo que no se puede reconstruir es el "+" del prefijo internacional. Por eso
 * el importador acepta una columna de pais y libphonenumber-js completa el
 * prefijo; y por eso la recomendacion para el usuario final es dar formato de
 * TEXTO a la columna de telefono antes de guardar el .xlsx.
 */
function numeroATexto(valor: number, numFmt?: string): string {
  if (!Number.isFinite(valor)) return "";

  let texto: string;
  if (Number.isInteger(valor) && Math.abs(valor) <= Number.MAX_SAFE_INTEGER) {
    texto = valor.toFixed(0);
  } else {
    texto = String(valor);
    if (texto.includes("e") || texto.includes("E")) {
      texto = valor.toLocaleString("en-US", {
        useGrouping: false,
        maximumFractionDigits: 20,
      });
    }
  }

  // Ceros a la izquierda conservados en el formato de la celda ("00000000").
  const formato = numFmt?.replace(/["';@_*]/g, "").trim();
  if (formato && /^0+$/.test(formato) && !texto.startsWith("-")) {
    texto = texto.padStart(formato.length, "0");
  }

  return texto;
}

/**
 * Normaliza el valor de una celda de exceljs a texto plano.
 *
 * Se trabaja de forma estructural (sobre `unknown`) y no contra los tipos de
 * exceljs a proposito: el valor de una celda puede ser texto, numero, booleano,
 * fecha, texto enriquecido, hipervinculo, formula con resultado cacheado o un
 * valor de error (#N/A, #REF!...), y todos tienen que acabar en string.
 */
function valorCeldaATexto(valor: unknown, numFmt?: string): string {
  if (valor === null || valor === undefined) return "";
  if (typeof valor === "string") return valor.trim();
  if (typeof valor === "number") return numeroATexto(valor, numFmt);
  if (typeof valor === "boolean") return valor ? "true" : "false";
  if (valor instanceof Date) return valor.toISOString();

  if (typeof valor === "object") {
    const objeto = valor as Record<string, unknown>;

    // Texto enriquecido: { richText: [{ text }, ...] }
    if (Array.isArray(objeto.richText)) {
      return (objeto.richText as Array<{ text?: unknown }>)
        .map((trozo) => (typeof trozo?.text === "string" ? trozo.text : ""))
        .join("")
        .trim();
    }

    // Celda en error (#N/A, #REF!...): no hay dato aprovechable.
    if ("error" in objeto) return "";

    // Hipervinculo: { text, hyperlink }
    if ("text" in objeto) return valorCeldaATexto(objeto.text, numFmt);

    // Formula con resultado cacheado: { formula, result }
    if ("result" in objeto) return valorCeldaATexto(objeto.result, numFmt);

    // Formula sin resultado cacheado (el archivo nunca se recalculo).
    if ("formula" in objeto || "sharedFormula" in objeto) return "";
  }

  return String(valor).trim();
}

/**
 * Convierte la fila de encabezados en claves utilizables: sin espacios
 * sobrantes, sin huecos y sin repetidos (papaparse hace lo mismo con los
 * encabezados duplicados de un CSV).
 */
function normalizarEncabezados(valores: string[]): string[] {
  const vistos = new Map<string, number>();

  return valores.map((valor, indice) => {
    const base = valor.trim() || `columna_${indice + 1}`;
    const repeticiones = vistos.get(base) ?? 0;
    vistos.set(base, repeticiones + 1);
    return repeticiones === 0 ? base : `${base}_${repeticiones}`;
  });
}

/**
 * Carga exceljs de forma perezosa: es una dependencia pesada y una importacion
 * de CSV no tiene por que pagarla. Es CommonJS, asi que segun el empaquetador
 * la API llega en `default` o en el propio espacio de nombres.
 */
async function cargarExcelJS(): Promise<typeof import("exceljs")> {
  const modulo = await import("exceljs");
  const interoperable = modulo as unknown as { default?: typeof import("exceljs") };
  return interoperable.default ?? (modulo as typeof import("exceljs"));
}

/** Backend XLSX: primera hoja, primera fila = encabezados. */
async function parsearXlsx(bytes: Uint8Array): Promise<ParsedImportFile> {
  let ExcelJS: typeof import("exceljs");
  try {
    ExcelJS = await cargarExcelJS();
  } catch {
    return { rows: [], errors: [{ row: 0, error: "No se pudo inicializar el lector de Excel" }] };
  }

  const libro = new ExcelJS.Workbook();
  try {
    // Los tipos de exceljs redeclaran `Buffer` globalmente
    // (`declare interface Buffer extends ArrayBuffer {}`), asi que el Buffer
    // real de Node deja de encajar en su propia firma. En ejecucion JSZip
    // acepta Buffer/Uint8Array sin problema, de ahi el puente de tipos.
    await libro.xlsx.load(Buffer.from(bytes) as unknown as Parameters<typeof libro.xlsx.load>[0]);
  } catch {
    return {
      rows: [],
      errors: [
        {
          row: 0,
          error:
            "El archivo de Excel está dañado o protegido con contraseña. " +
            "Ábrelo en Excel y vuelve a guardarlo como .xlsx sin contraseña.",
        },
      ],
    };
  }

  // Solo la primera hoja: importar varias en silencio seria una sorpresa.
  const hoja = libro.worksheets[0];
  if (!hoja) {
    return { rows: [], errors: [{ row: 0, error: "El archivo de Excel no tiene ninguna hoja" }] };
  }

  const filaEncabezados = hoja.getRow(1);
  const totalColumnas = filaEncabezados.cellCount ?? 0;
  if (totalColumnas === 0) {
    return {
      rows: [],
      errors: [{ row: 1, error: "La primera fila de la hoja debe contener los encabezados" }],
    };
  }

  const encabezados = normalizarEncabezados(
    Array.from({ length: totalColumnas }, (_, i) =>
      valorCeldaATexto(filaEncabezados.getCell(i + 1).value)
    )
  );

  const rows: ImportRow[] = [];
  for (let numeroFila = 2; numeroFila <= hoja.rowCount; numeroFila++) {
    const fila = hoja.getRow(numeroFila);
    const registro: ImportRow = {};
    let vacia = true;

    for (let columna = 1; columna <= totalColumnas; columna++) {
      const celda = fila.getCell(columna);
      const numFmt = typeof celda.numFmt === "string" ? celda.numFmt : undefined;
      const texto = valorCeldaATexto(celda.value, numFmt);
      if (texto !== "") vacia = false;
      registro[encabezados[columna - 1]] = texto;
    }

    // Equivalente a `skipEmptyLines` del CSV: las hojas suelen arrastrar
    // cientos de filas en blanco despues del ultimo dato real.
    if (!vacia) rows.push(registro);
  }

  return { rows, errors: [] };
}

/** Backend CSV: delega en papaparse, que ya autodetecta el separador (`,`, `;`, tab, `|`). */
function parsearCsv(bytes: Uint8Array): ParsedImportFile {
  const texto = decodificarTexto(bytes);
  const resultado = Papa.parse<ImportRow>(texto, {
    header: true,
    skipEmptyLines: true,
  });

  // Errores de formato del propio CSV (comillas sin cerrar, columnas de mas...).
  // `+2` porque `row` es un indice base 0 sobre las filas de datos, y por
  // encima esta la fila de encabezados.
  const errors = (resultado.errors ?? []).slice(0, MAX_ERRORES_FORMATO).map((e) => ({
    row: typeof e.row === "number" ? e.row + 2 : 0,
    error: `Formato CSV: ${e.message}`,
  }));

  return { rows: resultado.data ?? [], errors };
}

/**
 * Lee un archivo de contactos (CSV o Excel) y devuelve sus filas como objetos
 * `encabezado -> texto`, mas los errores de formato detectados.
 *
 * No valida el contenido (nombres, telefonos, paises): de eso se encarga quien
 * llama. Aqui solo se resuelve "que formato es esto y como lo convierto en
 * filas de texto".
 */
export async function parseContactsFile(file: File): Promise<ParsedImportFile> {
  const bytes = new Uint8Array(await file.arrayBuffer());

  if (bytes.length === 0) {
    return { rows: [], errors: [{ row: 0, error: "El archivo está vacío" }] };
  }

  switch (detectarFormato(bytes)) {
    case "xlsx":
      return parsearXlsx(bytes);

    case "xls":
      // Formato binario antiguo. Mensaje accionable en lugar de un fallo opaco.
      return {
        rows: [],
        errors: [
          {
            row: 0,
            error:
              "El archivo es un Excel antiguo (.xls). Ábrelo en Excel y usa " +
              '"Guardar como" para guardarlo como .xlsx o .csv.',
          },
        ],
      };

    default:
      return parsearCsv(bytes);
  }
}
