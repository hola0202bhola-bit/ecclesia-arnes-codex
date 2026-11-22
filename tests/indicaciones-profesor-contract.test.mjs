import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import Ajv2020 from "ajv/dist/2020.js";
import { checkSecurity } from "../scripts/check-artifacts.mjs";
const root =
  process.env.ECCLESIA_PROJECT ??
  new URL("../../proyecto-ecclesia/", import.meta.url);
const read = (f) =>
  JSON.parse(
    readFileSync(
      typeof root === "string" ? resolve(root, f) : new URL(f, root),
      "utf8",
    ),
  );
const api = read("openapi.yaml"),
  reference = read("docs/api-referencia-revision03.json");
const ajv = new Ajv2020({ strict: false, validateFormats: false });
test("profesor: desvinculación mantiene autorización propia, motivo y versión de asignación", () => {
  checkSecurity(api);
  const path = "/iglesias/{iglesiaId}/agenda/asignaciones/{id}";
  assert.deepEqual(api.paths[path], reference.paths[path]);
  assert.deepEqual(api.paths[path].delete["x-roles"], ["ADMIN_IGLESIA"]);
  for (const name of [
    "AgendaDesvincularInput",
    "AgendaAsignacionRetirada",
    "AgendaSacerdote",
  ])
    assert.deepEqual(
      api.components.schemas[name],
      reference.components.schemas[name],
    );
  const schema = api.components.schemas.AgendaDesvincularInput;
  assert.equal(
    ajv.validate(schema, { version: 1, motivo: "Cambio institucional" }),
    true,
  );
  for (const d of [
    {},
    { version: 0, motivo: "X" },
    { version: "1", motivo: "X" },
    { version: 1, motivo: "  " },
    { version: 1, motivo: "x".repeat(501) },
    { version: 1, motivo: "X", actorId: "otro" },
  ])
    assert.equal(ajv.validate(schema, d), false);
  assert.ok(
    api.components.schemas.AgendaSacerdote.properties.asignacionVersion,
  );
});
test("profesor: referencia pública opcional exacta admite cero/null, rechaza datos de cotización privada", () => {
  for (const name of [
    "EspacioPublico",
    "EspacioGestion",
    "EspacioGuardarInput",
  ])
    assert.deepEqual(
      api.components.schemas[name],
      reference.components.schemas[name],
    );
  const input = api.components.schemas.EspacioGuardarInput;
  const base = { activo: true, version: 1 };
  for (const costoReferencia of ["0.00", "999999999.99", null])
    assert.equal(
      ajv.validate(input, {
        ...base,
        costoReferencia,
        responsablePublico: null,
      }),
      true,
    );
  for (const costoReferencia of [
    "",
    "-1.00",
    "01.00",
    "1.0",
    "1.000",
    "1000000000.00",
    "1.00\n",
    1,
  ])
    assert.equal(ajv.validate(input, { ...base, costoReferencia }), false);
  assert.equal(
    ajv.validate(input, { ...base, responsablePublico: " \t " }),
    false,
  );
  const publico = api.components.schemas.EspacioPublico;
  const valor = {
    tipo: "CRIPTA",
    costoReferencia: "0.00",
    responsablePublico: "Oficina institucional",
  };
  assert.equal(ajv.validate(publico, valor), true);
  for (const key of [
    "precio",
    "cotizacion",
    "condiciones",
    "nombre",
    "contacto",
    "folio",
    "claveHash",
    "actorId",
    "version",
  ])
    assert.equal(ajv.validate(publico, { ...valor, [key]: "privado" }), false);
});
