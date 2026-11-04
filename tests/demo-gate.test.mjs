import test from "node:test";
import assert from "node:assert/strict";
import { cpSync, mkdtempSync, rmSync, renameSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { checkProductInputs } from "../scripts/check-product.mjs";

test("CT20 exige ejecutor, carga, suite, migración y fuentes sin aceptar copia incompleta", () => {
  const source =
    process.env.ECCLESIA_PROJECT ??
    fileURLToPath(new URL("../../proyecto-ecclesia", import.meta.url));
  const temp = mkdtempSync(join(tmpdir(), "ecclesia-demo-gate-"));
  try {
    cpSync(source, temp, {
      recursive: true,
      filter: (p) =>
        !/[\\/](node_modules|coverage|dist|evidence|\.git|\.demo|\.githooks)([\\/]|$)/.test(
          p,
        ),
    });
    const files = checkProductInputs(temp);
    // Los fixtures históricos del hook comprueban herramientas sin aplicación.
    // Mantener ese contrato; los proyectos con código sí exigen todos los archivos CT20.
    if (!files.length) {
      assert.deepEqual(files, []);
      return;
    }
    for (const path of [
      "scripts/demo.mjs",
      "prisma/demo/carga.ts",
      "prisma/demo/ejecutar.ts",
      "tests/demo.test.ts",
      "prisma/migrations/202611040001_demo/migration.sql",
      "prisma/demo/fuentes/manifest.json",
      "prisma/demo/fuentes/301930001.json",
    ]) {
      const full = join(temp, path);
      renameSync(full, full + ".ausente");
      assert.throws(
        () => checkProductInputs(temp),
        /Pipeline de producto incompleto/,
      );
      renameSync(full + ".ausente", full);
    }
  } finally {
    rmSync(temp, { recursive: true, force: true });
  }
});
