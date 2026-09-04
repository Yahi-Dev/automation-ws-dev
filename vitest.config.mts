import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

// El alias "@/*" del tsconfig apunta a la raiz Y a ./src, y el codigo importa
// como "@/src/lib/...". Mapear "@" a la raiz cubre ese patron.
const root = fileURLToPath(new URL(".", import.meta.url));

export default defineConfig({
  resolve: {
    alias: { "@": root.replace(/[\/]$/, "") },
  },
  test: {
    environment: "node",
    globals: false,
    include: ["tests/**/*.test.ts"],
    setupFiles: ["tests/setup.ts"],
  },
});
