import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import Ajv2020 from "ajv/dist/2020.js";
import { checkSecurity } from "../scripts/check-artifacts.mjs";
const root =
  process.env.ECCLESIA_PROJECT ??
  new URL("../../proyecto-ecclesia/", import.meta.url);
const read = (file) =>
  JSON.parse(
    readFileSync(
      typeof root === "string" ? resolve(root, file) : new URL(file, root),
      "utf8",
    ),
  );
const api = read("openapi.yaml"),
  actual = read("docs/api-referencia-revision03.json");
const ajv = new Ajv2020({ strict: false, validateFormats: false });
ajv.addSchema({ $id: "ultimo", components: api.components });
const valida = (name, data) =>
  ajv.validate({ $ref: `ultimo#/components/schemas/${name}` }, data);
test("RF04/RF11 operaciones reales conservan roles y contrato ejecutable", () => {
  checkSecurity(api);
  for (const [path, method] of [
    ["/iglesias/{iglesiaId}/cerrar", "post"],
    ["/iglesias/{iglesiaId}/reabrir", "post"],
    ["/criterios-patrimoniales", "get"],
    ["/criterios-patrimoniales", "post"],
    ["/criterios-patrimoniales/{criterioId}/activar", "post"],
  ]) {
    const op = api.paths[path][method];
    assert.equal(op["x-implementation"], "IMPLEMENTADO");
    assert.deepEqual(actual.paths[path][method], op);
    assert.deepEqual(
      op["x-roles"],
      path.includes("criterios")
        ? ["COORDINACION"]
        : ["COORDINACION", "ADMIN_IGLESIA"],
    );
    assert.deepEqual(op.security, [{ PersonalJWT: [] }]);
  }
  // No se amplía Coordinación a solicitudes o captura patrimonial.
  assert.deepEqual(api.paths["/iglesias/{iglesiaId}/objetos"].post["x-roles"], [
    "ADMIN_IGLESIA",
  ]);
});
test("RF04/11 versión y motivo obligatorios, sin rol ni ámbito de cliente", () => {
  for (const name of ["CierreIglesiaInput", "CriterioActivarInput"]) {
    assert.equal(
      valida(name, { version: 1, motivo: "Motivo de prueba" }),
      true,
    );
    for (const b of [
      { version: 0, motivo: "Prueba" },
      { version: 1 },
      { version: 1, motivo: "" },
      { version: 1, motivo: "Prueba", rol: "COORDINACION" },
    ])
      assert.equal(valida(name, b), false);
  }
});
test("RF11 parámetros completos y precisión entera sin aceptar factores ajenos", () => {
  const base = {
    tramos: [{ desde: 0, puntos: 1 }],
    factoresDecimas: Object.fromEntries(
      Array.from({ length: 12 }, (_, i) => [
        `30000000-0000-4000-8000-${String(i + 1).padStart(12, "0")}`,
        15,
      ]),
    ),
    bonoInahDecimas: 50,
    distinciones: [{ desdeDecimas: 80, nombre: "Valor patrimonial" }],
  };
  assert.equal(
    valida("CriterioVersionAlta", {
      nombre: "Revisión",
      parametros: base,
      motivo: "Revisión de prueba",
    }),
    true,
  );
  for (const cambio of [
    { bonoInahDecimas: -1 },
    { bonoInahDecimas: 5.1 },
    { factoresDecimas: {} },
    { factoresDecimas: { ...base.factoresDecimas, desconocido: 10 } },
  ])
    assert.equal(valida("CriterioParametros", { ...base, ...cambio }), false);
});
