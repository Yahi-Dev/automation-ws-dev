import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Artefactos que no son codigo fuente del proyecto.
    "coverage/**",
    "public/uploads/**",
  ]),
  {
    rules: {
      // Este proyecto adopto ESLint tarde (el script `lint` estuvo roto desde
      // la migracion a Next 16). `no-explicit-any` se deja en `warn` para que
      // el gate de CI sea util desde el primer dia sin exigir una limpieza de
      // tipos masiva en codigo que hoy funciona. El objetivo es que la cuenta
      // de avisos baje, nunca que suba: el codigo nuevo se escribe sin `any`.
      "@typescript-eslint/no-explicit-any": "warn",

      // Falso positivo conocido: el React Compiler no puede memoizar el valor
      // que devuelve `useReactTable()` de TanStack Table. Es el patron oficial
      // de la libreria y lo usan las 5 tablas del proyecto.
      "react-hooks/incompatible-library": "off",
    },
  },
]);

export default eslintConfig;
