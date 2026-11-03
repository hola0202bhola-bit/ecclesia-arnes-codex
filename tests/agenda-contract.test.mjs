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
ajv.addSchema({ $id: "agenda", components: api.components });
const valida = (name, value) =>
  ajv.validate({ $ref: `agenda#/components/schemas/${name}` }, value);
test("RF16–21: rutas de agenda ejecutables coinciden y no amplían permisos", () => {
  checkSecurity(api);
  let n = 0;
  for (const [path, item] of Object.entries(api.paths))
    for (const [method, op] of Object.entries(item))
      if (op.operationId?.startsWith("agendaV1_")) {
        n++;
        assert.equal(op["x-implementation"], "IMPLEMENTADO");
        assert.deepEqual(op, actual.paths[path][method]);
        assert.deepEqual(
          op["x-roles"],
          path.endsWith("/misas") ? ["PUBLICO"] : ["ADMIN_IGLESIA"],
        );
        assert.ok(op["x-pending"].includes("PC-12"));
      }
  assert.equal(n, 11);
});
const id = "60000000-0000-4000-8000-000000000001";
const horario = {
  sacerdoteId: id,
  diaSemana: 1,
  horaLocal: "10:00",
  tipo: "DIARIA",
  idioma: "Español",
  desde: "2026-10-05",
  hasta: "2026-10-26",
};
test("RF17/18: contrato de horario exige datos, duración positiva y versión para reemplazo", () => {
  assert.equal(valida("AgendaHorarioInput", horario), true);
  for (const cambio of [
    { diaSemana: 0 },
    { horaLocal: "24:00" },
    { tipo: "PASTOR" },
    { duracionMinutos: 0 },
    { iglesiaId: id },
    { actorId: id },
    { idioma: "" },
  ])
    assert.equal(
      valida("AgendaHorarioInput", { ...horario, ...cambio }),
      false,
    );
  assert.equal(valida("AgendaHorarioEdicion", horario), false);
  assert.equal(
    valida("AgendaHorarioEdicion", { ...horario, version: 1 }),
    true,
  );
});
test("RF20/21: el cliente no puede elegir autor, fecha de auditoría ni padre previsto", () => {
  const hecho = {
    ocurrenciaId: id,
    oficianteId: id,
    fechaLocal: "2026-10-05",
    horaLocal: "10:00",
    motivo: "Enfermedad",
  };
  assert.equal(valida("AgendaCelebracionInput", hecho), true);
  for (const campo of ["actorId", "registradoEn", "previstoId", "iglesiaId"])
    assert.equal(
      valida("AgendaCelebracionInput", { ...hecho, [campo]: id }),
      false,
    );
});
