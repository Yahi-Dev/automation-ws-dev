import { describe, it, expect } from "vitest";
import ExcelJS from "exceljs";
import { parseContactsFile } from "@/src/lib/import-parser";

/** Envuelve bytes o texto en un File, como el que llega desde el formulario. */
function archivo(contenido: Uint8Array | string, nombre: string, tipo = ""): File {
  const bytes =
    typeof contenido === "string" ? new TextEncoder().encode(contenido) : contenido;
  return new File([bytes as BlobPart], nombre, { type: tipo });
}

/**
 * Construye un .xlsx real en memoria con exceljs.
 * `celdas` es la matriz completa, encabezados incluidos.
 */
async function xlsx(
  celdas: unknown[][],
  formatos?: Record<string, string>
): Promise<Uint8Array> {
  const libro = new ExcelJS.Workbook();
  const hoja = libro.addWorksheet("Contactos");
  celdas.forEach((fila) => hoja.addRow(fila));

  for (const [direccion, numFmt] of Object.entries(formatos ?? {})) {
    hoja.getCell(direccion).numFmt = numFmt;
  }

  return new Uint8Array(await libro.xlsx.writeBuffer());
}

describe("parseContactsFile · deteccion por magic bytes", () => {
  it("trata como Excel un .xlsx aunque el nombre y el mime digan CSV", async () => {
    // El cliente controla la extension y `file.type`: la deteccion NO puede
    // fiarse de ellos. Este archivo se llama .csv y miente en el mime.
    const bytes = await xlsx([
      ["nombre", "telefono"],
      ["Ana", "+34600112233"],
    ]);

    const { rows } = await parseContactsFile(archivo(bytes, "contactos.csv", "text/csv"));

    expect(rows).toHaveLength(1);
    expect(rows[0].nombre).toBe("Ana");
    expect(rows[0].telefono).toBe("+34600112233");
  });

  it("trata como CSV un texto aunque el nombre diga .xlsx", async () => {
    const { rows } = await parseContactsFile(
      archivo(
        "nombre,telefono\nAna,+34600112233\n",
        "contactos.xlsx",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      )
    );

    expect(rows).toHaveLength(1);
    expect(rows[0].nombre).toBe("Ana");
  });

  it("rechaza el Excel binario antiguo (.xls) con un mensaje accionable", async () => {
    // Firma OLE2 de los .xls de Excel 97-2003.
    const ole2 = new Uint8Array([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1, 0x00, 0x00]);
    const { rows, errors } = await parseContactsFile(archivo(ole2, "viejo.xls"));

    expect(rows).toHaveLength(0);
    expect(errors[0].error).toContain(".xls");
    expect(errors[0].error).toContain("Guardar como");
  });

  it("informa de un archivo vacio en vez de devolver filas fantasma", async () => {
    const { rows, errors } = await parseContactsFile(archivo(new Uint8Array(), "vacio.csv"));

    expect(rows).toHaveLength(0);
    expect(errors[0].error).toContain("vacío");
  });

  it("informa de un .xlsx corrupto en vez de reventar", async () => {
    // Empieza por PK\x03\x04, asi que entra por la rama de Excel, pero el resto
    // del ZIP es basura.
    const zipRoto = new Uint8Array([0x50, 0x4b, 0x03, 0x04, 0x01, 0x02, 0x03, 0x04]);
    const { rows, errors } = await parseContactsFile(archivo(zipRoto, "roto.xlsx"));

    expect(rows).toHaveLength(0);
    expect(errors[0].error).toContain("dañado");
  });
});

describe("parseContactsFile · CSV", () => {
  it("ignora el BOM que Excel pone al guardar como CSV UTF-8", async () => {
    // Sin descartar el BOM, el primer encabezado seria "﻿nombre" y la
    // columna del nombre no se encontraria nunca.
    const conBom = "﻿nombre,telefono\nAna,+34600112233\n";
    const { rows } = await parseContactsFile(archivo(conBom, "bom.csv"));

    expect(Object.keys(rows[0])).toEqual(["nombre", "telefono"]);
    expect(rows[0].nombre).toBe("Ana");
  });

  it("autodetecta el separador ';' del Excel en español", async () => {
    const { rows } = await parseContactsFile(
      archivo("nombre;telefono;pais\nAna;+34600112233;ES\n", "puntoycoma.csv")
    );

    expect(rows).toHaveLength(1);
    expect(rows[0].telefono).toBe("+34600112233");
    expect(rows[0].pais).toBe("ES");
  });

  it("respeta las comillas y los separadores dentro del valor", async () => {
    const { rows } = await parseContactsFile(
      archivo('nombre,telefono\n"Pérez, Ana","+34600112233"\n', "comillas.csv")
    );

    expect(rows[0].nombre).toBe("Pérez, Ana");
    expect(rows[0].telefono).toBe("+34600112233");
  });

  it("conserva los encabezados con acentos y mayusculas tal cual", async () => {
    // El importador resuelve los alias en minusculas por su cuenta; el lector
    // no debe tocar el encabezado original.
    const { rows } = await parseContactsFile(
      archivo("Nombre,Teléfono,País\nAna,+34600112233,ES\n", "acentos.csv")
    );

    expect(Object.keys(rows[0])).toEqual(["Nombre", "Teléfono", "País"]);
    expect(rows[0]["Teléfono"]).toBe("+34600112233");
  });

  it("recupera los acentos de un CSV guardado en windows-1252", async () => {
    // "Nombre,País\nMaría,ES" con la Ñ/í en cp1252 (0xed = í, 0xed en País).
    const latin1 = new Uint8Array([
      0x4e, 0x6f, 0x6d, 0x62, 0x72, 0x65, 0x2c, 0x50, 0x61, 0x69, 0x73, 0x0a, // "Nombre,Pais\n"
      0x4d, 0x61, 0x72, 0xed, 0x61, 0x2c, 0x45, 0x53, 0x0a, // "Mar\xEDa,ES\n"
    ]);
    const { rows } = await parseContactsFile(archivo(latin1, "latin1.csv"));

    expect(rows[0].Nombre).toBe("María");
  });

  it("salta las lineas en blanco", async () => {
    const { rows } = await parseContactsFile(
      archivo("nombre,telefono\nAna,+34600112233\n\n\nLuis,+34600445566\n", "blancos.csv")
    );

    expect(rows).toHaveLength(2);
  });
});

describe("parseContactsFile · XLSX", () => {
  it("usa la primera fila como encabezados y devuelve la misma forma que el CSV", async () => {
    const bytes = await xlsx([
      ["Nombre", "Teléfono", "País"],
      ["Ana", "+34600112233", "ES"],
      ["Luis", "+34600445566", "ES"],
    ]);

    const { rows, errors } = await parseContactsFile(archivo(bytes, "contactos.xlsx"));

    expect(errors).toHaveLength(0);
    expect(rows).toHaveLength(2);
    expect(Object.keys(rows[0])).toEqual(["Nombre", "Teléfono", "País"]);
    expect(rows[1]["Teléfono"]).toBe("+34600445566");
  });

  it("conserva como texto un telefono guardado como celda numerica", async () => {
    // El fallo mas comun de una importacion real: Excel guarda 34600112233 como
    // NUMERO. Debe salir como "34600112233", nunca como notacion exponencial ni
    // con decimales.
    const bytes = await xlsx([
      ["nombre", "telefono"],
      ["Ana", 34600112233],
    ]);

    const { rows } = await parseContactsFile(archivo(bytes, "numerico.xlsx"));

    expect(rows[0].telefono).toBe("34600112233");
    expect(typeof rows[0].telefono).toBe("string");
    expect(rows[0].telefono).not.toContain("e");
  });

  it("recupera los ceros a la izquierda cuando estan en el formato de la celda", async () => {
    // Excel guarda "0600112233" como el numero 600112233 y recuerda los ceros
    // en el numFmt. Sin esto, el telefono nacional llegaria mutilado.
    const bytes = await xlsx(
      [
        ["nombre", "telefono"],
        ["Ana", 600112233],
      ],
      { B2: "0000000000" }
    );

    const { rows } = await parseContactsFile(archivo(bytes, "ceros.xlsx"));

    expect(rows[0].telefono).toBe("0600112233");
  });

  it("normaliza celdas de tipos variados (booleano, formula, texto enriquecido)", async () => {
    const libro = new ExcelJS.Workbook();
    const hoja = libro.addWorksheet("Contactos");
    hoja.addRow(["nombre", "telefono", "activo"]);
    const fila = hoja.addRow([]);
    fila.getCell(1).value = { richText: [{ text: "An" }, { text: "a" }] };
    fila.getCell(2).value = { formula: 'CONCATENATE("+34","600112233")', result: "+34600112233" };
    fila.getCell(3).value = true;
    const bytes = new Uint8Array(await libro.xlsx.writeBuffer());

    const { rows } = await parseContactsFile(archivo(bytes, "tipos.xlsx"));

    expect(rows[0].nombre).toBe("Ana");
    expect(rows[0].telefono).toBe("+34600112233");
    expect(rows[0].activo).toBe("true");
  });

  it("descarta las filas totalmente vacias que arrastran las hojas", async () => {
    const bytes = await xlsx([
      ["nombre", "telefono"],
      ["Ana", "+34600112233"],
      [null, null],
      ["", ""],
      ["Luis", "+34600445566"],
    ]);

    const { rows } = await parseContactsFile(archivo(bytes, "huecos.xlsx"));

    expect(rows).toHaveLength(2);
    expect(rows.map((r) => r.nombre)).toEqual(["Ana", "Luis"]);
  });

  it("da nombre propio a los encabezados repetidos o en blanco", async () => {
    const bytes = await xlsx([
      ["nombre", "", "nombre"],
      ["Ana", "x", "Pérez"],
    ]);

    const { rows } = await parseContactsFile(archivo(bytes, "encabezados.xlsx"));

    expect(Object.keys(rows[0])).toEqual(["nombre", "columna_2", "nombre_1"]);
    expect(rows[0].nombre).toBe("Ana");
    expect(rows[0].nombre_1).toBe("Pérez");
  });

  it("solo lee la primera hoja del libro", async () => {
    const libro = new ExcelJS.Workbook();
    const primera = libro.addWorksheet("Buenos");
    primera.addRow(["nombre", "telefono"]);
    primera.addRow(["Ana", "+34600112233"]);
    const segunda = libro.addWorksheet("Notas");
    segunda.addRow(["nombre", "telefono"]);
    segunda.addRow(["Luis", "+34600445566"]);
    const bytes = new Uint8Array(await libro.xlsx.writeBuffer());

    const { rows } = await parseContactsFile(archivo(bytes, "dos-hojas.xlsx"));

    expect(rows).toHaveLength(1);
    expect(rows[0].nombre).toBe("Ana");
  });
});
