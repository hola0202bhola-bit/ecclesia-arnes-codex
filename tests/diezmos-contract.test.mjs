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
ajv.addSchema({ $id: "diezmos", components: api.components });
const valida = (name, value) =>
  ajv.validate({ $ref: `diezmos#/components/schemas/${name}` }, value);
test("RF22–24 contrato ejecutable: tesorero captura, personal propio reporta, sin Coordinación", () => {
  checkSecurity(api);
  let n = 0;
  for (const [path, item] of Object.entries(api.paths))
    for (const [method, op] of Object.entries(item)) {
      if (
        !op.operationId?.startsWith("diezmos_") ||
        op.operationId === "diezmos_extremos"
      )
        continue;
      n++;
      assert.equal(op["x-implementation"], "IMPLEMENTADO");
      assert.deepEqual(op, actual.paths[path][method]);
      assert.deepEqual(
        op["x-roles"],
        op.operationId === "diezmos_reporte"
          ? ["ADMIN_IGLESIA", "TESORERO"]
          : ["TESORERO"],
      );
      assert.deepEqual(op.security, [{ PersonalJWT: [] }]);
    }
  assert.equal(n, 5);
  for (const [name, schema] of Object.entries(api.components.schemas))
    if (name.startsWith("Diezmo") && !["Diezmo", "DiezmoInput"].includes(name))
      assert.deepEqual(schema, actual.components.schemas[name]);
  assert.equal(
    api.paths["/iglesias/{iglesiaId}/reportes/diezmos/extremos"].get[
      "x-implementation"
    ],
    "DISEÑO_NO_IMPLEMENTADO",
  );
});
test("RF22/23 contrato rechaza dinero float, identidad del cliente y correcciones sin versión", () => {
  for (const importe of ["0.00", "0.01", "999999999.99"])
    assert.equal(valida("DiezmoAltaInput", { importe }), true);
  for (const importe of [
    0.1,
    "1e2",
    "01.00",
    "-0.01",
    "1.001",
    "1000000000.00",
  ])
    assert.equal(valida("DiezmoAltaInput", { importe }), false);
  for (const campo of [
    "actorId",
    "instante",
    "iglesiaId",
    "moneda",
    "celebracionId",
  ])
    assert.equal(
      valida("DiezmoAltaInput", { importe: "1.00", [campo]: "suplantado" }),
      false,
    );
  assert.equal(valida("DiezmoCorreccionInput", { importe: "1.00" }), false);
  assert.equal(
    valida("DiezmoCorreccionInput", { importe: "1.00", version: 0 }),
    false,
  );
  assert.equal(
    valida("DiezmoCorreccionInput", { importe: "1.00", version: 1 }),
    true,
  );
});
test("RF24 contrato distingue promedio racional, pendientes y extremos ausentes", () => {
  const vacio = {
    celebradas: 2,
    registradas: 0,
    pendientes: 2,
    totalCentavos: "0",
    total: "0.00",
    promedio: null,
    maximo: { importeCentavos: null, celebraciones: [] },
    minimo: { importeCentavos: null, celebraciones: [] },
  };
  assert.equal(valida("DiezmoResumen", vacio), true);
  const conDatos = {
    ...vacio,
    registradas: 3,
    pendientes: 0,
    celebradas: 3,
    totalCentavos: "2",
    total: "0.02",
    promedio: { numeradorCentavos: "2", divisorMisas: 3 },
  };
  assert.equal(valida("DiezmoResumen", conDatos), true);
  assert.equal(
    valida("DiezmoResumen", { ...conDatos, totalCentavos: 2 }),
    false,
  );
  assert.equal(
    valida("DiezmoResumen", { ...conDatos, promedio: 0.006666 }),
    false,
  );
  assert.equal(
    valida("DiezmoConsulta", {
      desde: "2026-10-01",
      hasta: "2026-10-31",
      periodo: "SEMANA",
      desglose: "HORARIO_SACERDOTE",
    }),
    true,
  );
  assert.equal(
    valida("DiezmoConsulta", {
      desde: "2026-10-01",
      hasta: "2026-10-31",
      iglesiaId: "ajena",
    }),
    false,
  );
});
