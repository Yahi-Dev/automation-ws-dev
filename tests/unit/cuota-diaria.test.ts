import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

/**
 * El tope de 24 h no protege de un error: protege del castigo de Meta.
 *
 * Pasarse del limite baja la calificacion de calidad del numero, y esa
 * calificacion es lo que decide si te dejan seguir enviando o te bloquean. Un
 * fallo aqui no se nota el dia que ocurre: se nota semanas despues, cuando el
 * numero deja de servir y ya no hay forma de recuperarlo.
 */

const consultaCruda = vi.fn();

vi.mock("@/src/lib/prisma", () => ({
  default: {
    get $queryRaw() {
      // Prisma lo invoca como plantilla etiquetada; solo interesa lo que devuelve.
      return (...args: unknown[]) => consultaCruda(...args);
    },
  },
}));

const AHORA = new Date("2026-09-13T18:00:00.000Z");

async function cargar(cuota?: string) {
  vi.resetModules();
  if (cuota === undefined) delete process.env.WHATSAPP_DAILY_QUOTA;
  else process.env.WHATSAPP_DAILY_QUOTA = cuota;
  return import("@/src/lib/cuota-diaria");
}

beforeEach(() => {
  consultaCruda.mockReset();
});

afterEach(() => {
  delete process.env.WHATSAPP_DAILY_QUOTA;
});

describe("estadoCuota", () => {
  it("por defecto son 250, que es el techo de un numero sin verificar", async () => {
    const { CUOTA_DIARIA } = await cargar();
    expect(CUOTA_DIARIA).toBe(250);
  });

  it("descuenta lo ya enviado en las ultimas 24 h", async () => {
    const { estadoCuota } = await cargar("250");
    consultaCruda.mockResolvedValue([{ usados: 40 }]);

    const estado = await estadoCuota(AHORA);
    expect(estado).toEqual({ cuota: 250, usados: 40, disponibles: 210 });
  });

  // MySQL devuelve COUNT() como BigInt a traves de Prisma. Sin convertirlo, la
  // resta da NaN y `disponibles <= 0` seria false: el tope no frenaria NADA.
  it("entiende el BigInt que devuelve MySQL en un COUNT", async () => {
    const { estadoCuota } = await cargar("250");
    consultaCruda.mockResolvedValue([{ usados: BigInt(100) }]);

    const estado = await estadoCuota(AHORA);
    expect(estado.usados).toBe(100);
    expect(estado.disponibles).toBe(150);
    expect(Number.isNaN(estado.disponibles)).toBe(false);
  });

  it("no devuelve numeros negativos si ya se paso del tope", async () => {
    const { estadoCuota } = await cargar("250");
    consultaCruda.mockResolvedValue([{ usados: 400 }]);

    const estado = await estadoCuota(AHORA);
    expect(estado.disponibles).toBe(0);
  });

  it("una tabla vacia no rompe la cuenta", async () => {
    const { estadoCuota } = await cargar("250");
    consultaCruda.mockResolvedValue([]);

    const estado = await estadoCuota(AHORA);
    expect(estado.usados).toBe(0);
    expect(estado.disponibles).toBe(250);
  });

  it("con cuota 0 no hay tope y no se consulta la base de datos", async () => {
    const { estadoCuota } = await cargar("0");

    const estado = await estadoCuota(AHORA);
    expect(estado.disponibles).toBe(Number.POSITIVE_INFINITY);
    // Importante: ni siquiera pregunta. Desactivado es desactivado.
    expect(consultaCruda).not.toHaveBeenCalled();
  });

  it("se puede subir el tope cuando Meta sube el escalon", async () => {
    const { estadoCuota } = await cargar("1000");
    consultaCruda.mockResolvedValue([{ usados: 250 }]);

    const estado = await estadoCuota(AHORA);
    expect(estado).toEqual({ cuota: 1000, usados: 250, disponibles: 750 });
  });
});

describe("los avisos que lee una persona", () => {
  it("el de cupo agotado dice que NO es un fallo y que nada se perdio", async () => {
    const { avisoCuotaAgotada } = await cargar("250");
    const texto = avisoCuotaAgotada({ cuota: 250, usados: 250, disponibles: 0 });

    expect(texto).toContain("250");
    expect(texto).toContain("24 horas");
    expect(texto).toContain("No es un fallo");
    expect(texto).toContain("no se perdió nada");
    // Lo mas importante: que no hay que volver a pulsar nada.
    expect(texto).toContain("salen solos");
  });

  it("el de envio parcial dice cuantos salieron, cuantos faltan y por que", async () => {
    const { avisoCuotaParcial } = await cargar("250");
    const texto = avisoCuotaParcial(250, 2750, 250);

    expect(texto).toContain("250");
    expect(texto).toContain("2750");
    expect(texto).toContain("No hay que volver a pulsar nada");
  });

  it("ningun aviso usa vocabulario tecnico", async () => {
    const { avisoCuotaAgotada, avisoCuotaParcial } = await cargar("250");
    const textos = [
      avisoCuotaAgotada({ cuota: 250, usados: 250, disponibles: 0 }),
      avisoCuotaParcial(250, 2750, 250),
    ];

    for (const texto of textos) {
      const bajo = texto.toLowerCase();
      for (const jerga of ["cuota", "rate limit", "throttl", "api", "meta", "tier"]) {
        expect(bajo).not.toContain(jerga);
      }
    }
  });
});
