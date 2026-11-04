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
const api = read("openapi.yaml");
const actual = read("docs/api-referencia-revision03.json");
const ajv = new Ajv2020({ strict: false, validateFormats: false });
ajv.addSchema({ $id: "patrimonio", components: api.components });
const validar = (name, data) =>
  ajv.validate({ $ref: `patrimonio#/components/schemas/${name}` }, data);
const datos = {
  descripcion: "Pieza ficticia",
  tipoId: "30000000-0000-4000-8000-000000000001",
  anioExacto: 1720,
  material: "Prueba",
  conservacion: "Prueba",
  ubicacionInterna: "Prueba",
  catalogadoInah: true,
};
test("RF07–10/12: operaciones ejecutables conservan política explícita y DTOs idénticos", () => {
  checkSecurity(api);
  for (const [path, methods] of Object.entries({
    "/ranking-patrimonial": ["get"],
    "/iglesias/por-patrimonio": ["get"],
    "/iglesias/{iglesiaId}/objetos": ["get", "post"],
    "/iglesias/{iglesiaId}/objetos/{objetoId}": ["patch"],
    "/iglesias/{iglesiaId}/objetos/{objetoId}/condicion": ["put"],
  }))
    for (const method of methods) {
      const op = api.paths[path][method];
      assert.equal(op["x-implementation"], "IMPLEMENTADO");
      assert.deepEqual(actual.paths[path][method], op);
      assert.deepEqual(
        op["x-roles"],
        method === "get" ? ["PUBLICO"] : ["ADMIN_IGLESIA"],
      );
    }
  for (const name of [
    "PatrimonioAlta",
    "PatrimonioPatchInput",
    "PatrimonioConsulta",
    "PatrimonioRanking",
  ])
    assert.deepEqual(
      actual.components.schemas[name],
      api.components.schemas[name],
    );
  assert.equal(
    api.paths["/criterios-patrimoniales/{criterioId}/activar"].post[
      "x-implementation"
    ],
    "IMPLEMENTADO",
  );
});
test("RF07: fecha exclusiva, campos completos, booleano estricto y sin ámbito aportado por cliente", () => {
  assert.equal(validar("PatrimonioAlta", datos), true);
  for (const cambios of [
    { anioExacto: null },
    { siglo: 18 },
    { catalogadoInah: "false" },
    { iglesiaId: datos.tipoId },
    { condicion: "BAJA" },
    { descripcion: " " },
  ])
    assert.equal(validar("PatrimonioAlta", { ...datos, ...cambios }), false);
  for (const campo of [
    "descripcion",
    "material",
    "conservacion",
    "ubicacionInterna",
    "catalogadoInah",
    "tipoId",
  ]) {
    const invalido = { ...datos };
    delete invalido[campo];
    assert.equal(validar("PatrimonioAlta", invalido), false);
  }
  assert.equal(
    validar("PatrimonioAlta", { ...datos, anioExacto: null, siglo: 18 }),
    true,
  );
});
test("RF08/09: concurrencia obligatoria e índice decimal sin pérdida ni datos de auditoría pública", () => {
  assert.equal(
    validar("PatrimonioPatchInput", { version: 1, descripcion: "Cambio" }),
    true,
  );
  for (const invalido of [
    { version: 1 },
    { descripcion: "Cambio" },
    { version: 0, descripcion: "Cambio" },
    { version: 1, iglesiaId: datos.tipoId },
  ])
    assert.equal(validar("PatrimonioPatchInput", invalido), false);
  const calculo = {
    indice: "35.5",
    distincion: "Alto valor patrimonial",
    referencia: 2026,
    criterioId: "caso-v1",
    aportaciones: [],
  };
  assert.equal(validar("PatrimonioCalculo", calculo), true);
  assert.equal(
    validar("PatrimonioCalculo", { ...calculo, indice: 35.5 }),
    false,
  );
  assert.equal(
    validar("PatrimonioCalculo", { ...calculo, actorId: datos.tipoId }),
    false,
  );
});
