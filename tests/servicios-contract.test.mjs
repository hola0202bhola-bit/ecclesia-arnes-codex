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
ajv.addSchema({ $id: "oferta", components: api.components });
const validar = (name, value) =>
  ajv.validate({ $ref: `oferta#/components/schemas/${name}` }, value);
const servicio = {
  tipoId: "40000000-0000-4000-8000-000000000001",
  nombre: "Servicio ficticio",
  modalidad: "FIJO",
  importe: "123.45",
  moneda: "MXN",
  requisitos: "Prueba",
  duracionMinutos: 45,
  requiereCita: false,
  horarios: [{ diaSemana: 6, horaLocal: "10:00" }],
};
test("RF13–15: contrato ejecutable coincide con subconjunto, público consulta y solo administrador propio escribe", () => {
  checkSecurity(api);
  for (const clase of ["servicios", "platicas"])
    for (const [path, method] of [
      [`/iglesias/{iglesiaId}/${clase}`, "get"],
      [`/iglesias/{iglesiaId}/${clase}`, "post"],
      [`/iglesias/{iglesiaId}/${clase}/{recursoId}`, "patch"],
    ]) {
      const op = api.paths[path][method];
      assert.equal(op["x-implementation"], "IMPLEMENTADO");
      assert.deepEqual(op, actual.paths[path][method]);
      assert.deepEqual(
        op["x-roles"],
        method === "get" ? ["PUBLICO"] : ["ADMIN_IGLESIA"],
      );
      assert.ok(op["x-pending"].includes("PC-09"));
    }
  for (const name of [
    "ServicioCreateInput",
    "ServicioPatchInput",
    "PlaticaCreateInput",
    "PlaticaPatchInput",
    "ServiciosConsulta",
    "PlaticasConsulta",
  ])
    assert.deepEqual(
      api.components.schemas[name],
      actual.components.schemas[name],
    );
});
test("RF13: modalidades excluyen tarifa en gratuito/donativo y conservan decimal exacto, versión y ámbito", () => {
  assert.equal(validar("ServicioCreateInput", servicio), true);
  for (const modalidad of ["GRATUITO", "DONATIVO"]) {
    assert.equal(
      validar("ServicioCreateInput", { ...servicio, modalidad, importe: null }),
      true,
    );
    assert.equal(
      validar("ServicioCreateInput", { ...servicio, modalidad }),
      false,
    );
  }
  for (const cambio of [
    { importe: null },
    { importe: "0.00" },
    { importe: "1.234" },
    { importe: 123.45 },
    { requiereCita: "false" },
    { iglesiaId: servicio.tipoId },
    { horarios: [] },
  ])
    assert.equal(
      validar("ServicioCreateInput", { ...servicio, ...cambio }),
      false,
    );
  assert.equal(
    validar("ServicioPatchInput", { version: 1, importe: "123.45" }),
    true,
  );
  assert.equal(validar("ServicioPatchInput", { version: 1 }), false);
  assert.equal(validar("ServicioPatchInput", { importe: "123.45" }), false);
  assert.equal(
    validar("Servicio", {
      ...servicio,
      id: servicio.tipoId,
      version: 1,
      actorId: servicio.tipoId,
    }),
    false,
  );
});
