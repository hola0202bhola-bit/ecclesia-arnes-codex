import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, cpSync, mkdtempSync, renameSync, rmSync } from "node:fs";
import { join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { createHash } from "node:crypto";
import Ajv2020 from "ajv/dist/2020.js";
import { checkSecurity } from "../scripts/check-artifacts.mjs";
import { checkProductInputs } from "../scripts/check-product.mjs";
import { sourceFiles } from "../scripts/check-architecture.mjs";
import { fileURLToPath } from "node:url";
const root =
  process.env.ECCLESIA_PROJECT ??
  new URL("../../proyecto-ecclesia/", import.meta.url);
const path = (file) =>
  typeof root === "string" ? resolve(root, file) : new URL(file, root);
const read = (file) => JSON.parse(readFileSync(path(file), "utf8"));
test("RF05 contrato real exige Coordinación, vista previa y motivo sin claves libres", () => {
  const api = read("openapi.yaml"),
    actual = read("docs/api-referencia-revision03.json");
  checkSecurity(api);
  const base = "/catalogos/importaciones-localidades";
  for (const [route, method] of [
    [base, "get"],
    [base, "post"],
    [base + "/{importacionId}", "get"],
    [base + "/{importacionId}/original", "get"],
    [base + "/{importacionId}/aplicar", "post"],
    [base + "/{importacionId}/revertir", "post"],
  ]) {
    const op = api.paths[route][method];
    assert.equal(op["x-implementation"], "IMPLEMENTADO");
    assert.deepEqual(op["x-roles"], ["COORDINACION"]);
    assert.deepEqual(op.security, [{ PersonalJWT: [] }]);
    assert.deepEqual(actual.paths[route][method], op);
  }
  const ajv = new Ajv2020({ strict: false, validateFormats: false });
  const schema = api.components.schemas.LocalidadesPreviaInput;
  assert.equal(
    ajv.validate(schema, {
      estadoClave: "21",
      municipioClave: "114",
      origen: "SNAPSHOT",
    }),
    true,
  );
  for (const b of [
    { estadoClave: "21", municipioClave: "000", origen: "INEGI" },
    { estadoClave: "99", municipioClave: "114", origen: "INEGI" },
    {
      estadoClave: "21",
      municipioClave: "114",
      origen: "INEGI",
      url: "https://ajeno.invalid",
    },
    {
      estadoClave: "21",
      municipioClave: "114",
      origen: "INEGI",
      localidades: [],
    },
  ])
    assert.equal(ajv.validate(schema, b), false);
  assert.equal(
    ajv.validate(api.components.schemas.LocalidadesMotivoInput, {
      motivo: "Revisión oficial",
    }),
    true,
  );
  for (const b of [{ motivo: "" }, { motivo: "Prueba", actorId: "ajeno" }])
    assert.equal(
      ajv.validate(api.components.schemas.LocalidadesMotivoInput, b),
      false,
    );
});
test("RF05 snapshot oficial conserva hash, conteo y jerarquía independiente del importador", () => {
  // Los fixtures históricos sin producto prueban herramientas y contrato.
  // Cualquier producto con fuentes sigue exigiendo los originales completos.
  if (
    !sourceFiles(typeof root === "string" ? root : fileURLToPath(root)).length
  )
    return;
  const m = read("prisma/fuentes/rf05/manifest.json");
  const raw = readFileSync(path("prisma/fuentes/rf05/21114.json"));
  assert.equal(createHash("sha256").update(raw).digest("hex"), m.sha256);
  assert.equal(
    m.fuente,
    "https://gaia.inegi.org.mx/wscatgeo/v2/localidades/21114",
  );
  const v = JSON.parse(raw);
  assert.equal(v.numReg, 144);
  assert.equal(v.datos.length, 144);
  assert.equal(new Set(v.datos.map((x) => x.cvegeo)).size, 144);
  for (const l of v.datos) {
    assert.equal(l.cvegeo, l.cve_ent + l.cve_mun + l.cve_loc);
    assert.equal(l.cve_ent, "21");
    assert.equal(l.cve_mun, "114");
  }
  assert.match(
    readFileSync(path(".gitattributes"), "utf8"),
    /prisma\/fuentes\/rf05\/\?{5}\.json -text/,
  );
});
test("RF05 gate rechaza suite, migración, vista y fuentes ausentes", () => {
  const temp = mkdtempSync(join(tmpdir(), "ecclesia-inegi-gate-"));
  try {
    cpSync(root, temp, {
      recursive: true,
      filter: (p) =>
        !/[\\/](node_modules|coverage|dist|evidence|\.git|\.demo|\.githooks)([\\/]|$)/.test(
          p,
        ),
    });
    if (!checkProductInputs(temp).length) return;
    for (const file of [
      "tests/importacion-localidades.test.ts",
      "views/importacion-localidades.ejs",
      "prisma/migrations/202611040003_localidades/migration.sql",
      "prisma/fuentes/rf05/21114.json",
      "prisma/fuentes/rf05/manifest.json",
    ]) {
      const full = join(temp, file);
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
