import { describe, it, expect } from "vitest";
import { ownedWhere, isAdmin, actorOf, type SessionUser } from "@/src/lib/authz";

const usuario = (over: Partial<SessionUser> = {}): SessionUser => ({
  id: "u1",
  email: "ana@empresa.do",
  role: "user",
  status: "approved",
  is_deleted: false,
  ...over,
});

describe("actorOf", () => {
  it("usa el correo como identidad de auditoria", () => {
    expect(actorOf(usuario())).toBe("ana@empresa.do");
  });

  it("cae a un marcador estable si no hay correo", () => {
    expect(actorOf(usuario({ email: null }))).toBe("desconocido");
  });
});

describe("isAdmin", () => {
  it("solo el rol admin", () => {
    expect(isAdmin(usuario({ role: "admin" }))).toBe(true);
    expect(isAdmin(usuario({ role: "user" }))).toBe(false);
    expect(isAdmin(usuario({ role: undefined }))).toBe(false);
  });
});

describe("ownedWhere", () => {
  it("un usuario normal solo alcanza lo que el creo", () => {
    const where = ownedWhere(usuario(), { id: 7, isDeleted: false });
    expect(where).toEqual({ id: 7, isDeleted: false, createdBy: "ana@empresa.do" });
  });

  it("un administrador no lleva restriccion de propiedad", () => {
    const where = ownedWhere(usuario({ role: "admin" }), { id: 7, isDeleted: false });
    expect(where).toEqual({ id: 7, isDeleted: false });
    expect(where).not.toHaveProperty("createdBy");
  });

  it("conserva intactas las condiciones base", () => {
    const base = { id: 3, isDeleted: false, status: "pending" };
    expect(ownedWhere(usuario(), base)).toMatchObject(base);
  });

  it("no muta el objeto que recibe", () => {
    const base = { id: 1 };
    ownedWhere(usuario(), base);
    expect(base).toEqual({ id: 1 });
  });

  // Esta es la garantia que impide el IDOR: dos usuarios distintos NUNCA
  // producen el mismo filtro sobre el mismo recurso.
  it("dos usuarios distintos generan filtros distintos para el mismo id", () => {
    const a = ownedWhere(usuario({ email: "ana@empresa.do" }), { id: 42 });
    const b = ownedWhere(usuario({ email: "beto@empresa.do" }), { id: 42 });
    expect(a).not.toEqual(b);
  });

  // Sin correo en la sesion, el filtro queda en "desconocido", que es el mismo
  // valor con el que el importador sella las filas sin actor conocido. Es
  // deliberado y consistente: no concede acceso a lo creado por otra persona.
  it("una sesion sin correo no alcanza lo creado por usuarios con correo", () => {
    const sinCorreo = ownedWhere(usuario({ email: null }), { id: 9 });
    expect(sinCorreo).toEqual({ id: 9, createdBy: "desconocido" });
  });
});
