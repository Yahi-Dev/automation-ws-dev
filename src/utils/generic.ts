import crypto from "node:crypto";

export const validFilters = (filter: any) => {
    if (typeof filter === "string") {
        try {
            return JSON.parse(filter);
        } catch (error) {
            console.error("JSON parse error in validFilters:", error);
            throw new Error("El formato de 'Filter' no es válido.");
        }
    }
}

export const convertBigInts = (obj: any): any => {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj === 'bigint') return obj.toString();
  if (Array.isArray(obj)) return obj.map(convertBigInts);
  if (typeof obj === 'object') {
    return Object.fromEntries(
      Object.entries(obj).map(([k, v]) => [k, convertBigInts(v)])
    );
  }
  return obj;
}

const norm = (s: string) => s.normalize("NFC").trim().toLowerCase();

const canonPath = (p: string) => {
  if (!p) return "";
  const s = p.replace(/\\/g, "/").replace(/\/+/g, "/").replace(/\/$/, "");
  const parts = s.split("/").filter(Boolean).filter(x => x !== "." && x !== "..");
  return parts.map(norm).join("/");
};

export const dupeKey = (companyId: number | string, typeId: number | string, path: string, name: string) => {
  const full = `${companyId}/${typeId}/${canonPath(path)}/${norm(name)}`;
  return crypto.createHash("sha256").update(full).digest("hex"); // 64 chars
};