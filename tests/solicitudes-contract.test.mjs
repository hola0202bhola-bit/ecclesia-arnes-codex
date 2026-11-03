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
  actual = read("docs/api-referencia-revision03.json");
const ajv = new Ajv2020({ strict: false, validateFormats: false });
ajv.addSchema({ $id: "solicitudes", components: api.components });
const valida = (name, value) =>
  ajv.validate({ $ref: `solicitudes#/components/schemas/${name}` }, value);
test("RF25–31 contrato real coincide, roles mínimos y credencial separada de personal", () => {
  checkSecurity(api);
  let implementadas = 0;
  for (const [p, item] of Object.entries(api.paths))
    for (const [m, op] of Object.entries(item)) {
      if (
        !op.operationId?.startsWith("solicitudes_") ||
        op["x-implementation"] !== "IMPLEMENTADO"
      )
        continue;
      implementadas++;
      assert.deepEqual(op, actual.paths[p][m]);
      if (op["x-roles"].includes("ADMIN_IGLESIA"))
        assert.deepEqual(op.security, [{ PersonalJWT: [] }]);
      else if (op["x-roles"].includes("SOLICITANTE"))
        assert.deepEqual(op.security, [{ SolicitudClave: [] }]);
      else assert.deepEqual(op.security, []);
      assert.equal(op["x-roles"].includes("COORDINACION"), false);
      assert.equal(op["x-roles"].includes("TESORERO"), false);
    }
  assert.equal(implementadas, 12);
  for (const name of [
    "EspacioPublico",
    "EspacioGestion",
    "EspacioGuardarInput",
    "SolicitudAltaInput",
    "SolicitudRecibo",
    "SolicitudCotizacion",
    "SolicitudSeguimiento",
    "SolicitudFila",
    "SolicitudFicha",
    "SolicitudRevisionInput",
    "SolicitudDecisionInput",
    "SolicitudLista",
    "SolicitudAccesoFormulario",
    "SolicitudAuditoria",
  ])
    assert.deepEqual(
      api.components.schemas[name],
      actual.components.schemas[name],
    );
});
test("RF25/26 contrato impide precio público y campos de identidad/estado en alta", () => {
  assert.equal(valida("EspacioPublico", { tipo: "NICHO" }), true);
  assert.equal(
    valida("EspacioPublico", { tipo: "NICHO", precio: "1.00" }),
    false,
  );
  for (const tipo of ["CRIPTA", "NICHO", "COLUMBARIO", "OSARIO"])
    assert.equal(valida("EspacioPublico", { tipo }), true);
  assert.equal(valida("EspacioPublico", { tipo: "OTRO" }), false);
  const d = {
    tipo: "NICHO",
    nombre: "Persona ficticia",
    contacto: "persona@example.invalid",
    peticionId: "00000000-0000-4000-8000-000000000001",
  };
  assert.equal(valida("SolicitudAltaInput", d), true);
  for (const campo of [
    "iglesiaId",
    "actorId",
    "claveHash",
    "estado",
    "version",
    "precio",
    "emitida",
    "vence",
  ])
    assert.equal(
      valida("SolicitudAltaInput", { ...d, [campo]: "suplantado" }),
      false,
    );
  assert.equal(valida("SolicitudAltaInput", { ...d, nombre: "" }), false);
  assert.equal(valida("SolicitudAltaInput", { ...d, contacto: "x" }), false);
});
test("RF28–31 contrato exige precio decimal, condiciones y versión; seguimiento sin contacto/hash", () => {
  for (const d of [
    { resultado: "SIN_LUGAR", version: 1 },
    {
      resultado: "COTIZAR",
      version: 1,
      precio: "0.10",
      condiciones: "Solo el servicio",
    },
  ])
    assert.equal(valida("SolicitudRevisionInput", d), true);
  for (const d of [
    { resultado: "COTIZAR", version: 1, precio: 0.1, condiciones: "X" },
    { resultado: "COTIZAR", version: 1, precio: "1.00", condiciones: "" },
    { resultado: "SIN_LUGAR", version: 0 },
    { resultado: "SIN_LUGAR", version: 1, actorId: "otro" },
  ])
    assert.equal(valida("SolicitudRevisionInput", d), false);
  const s = {
    folio: "A".repeat(24),
    iglesiaId: "00000000-0000-4000-8000-000000000001",
    tipo: "NICHO",
    estado: "REGISTRADA",
    version: 1,
    creada: "2026-11-03T20:00:00.000Z",
    decisionEn: null,
    cotizacion: null,
  };
  assert.equal(valida("SolicitudSeguimiento", s), true);
  for (const campo of [
    "clave",
    "claveHash",
    "nombre",
    "contacto",
    "historial",
    "peticionId",
  ])
    assert.equal(
      valida("SolicitudSeguimiento", { ...s, [campo]: "secreto" }),
      false,
    );
  assert.equal(valida("SolicitudDecisionInput", { version: 1 }), true);
  assert.equal(valida("SolicitudDecisionInput", {}), false);
  assert.equal(valida("SolicitudDecisionInput", { version: 0 }), false);
});
test("RF26/27/29 defensas documentadas en rutas reales y decisiones pendientes conservadas", () => {
  for (const [p, item] of Object.entries(api.paths))
    for (const [method, op] of Object.entries(item)) {
      if (
        !op.operationId?.startsWith("solicitudes_") ||
        op["x-implementation"] !== "IMPLEMENTADO"
      )
        continue;
      assert.ok(p.startsWith("/"));
      assert.match(op.description, /ADR010/);
      if (method === "post" && !op["x-roles"].includes("ADMIN_IGLESIA")) {
        assert.ok(op.parameters.some((p) => p.name === "Origin" && p.required));
        assert.ok(
          op.parameters.some((p) => p.name === "X-CSRF-Token" && p.required),
        );
        assert.ok(op.responses["429"]);
      }
    }
  const r = readFileSync(
    typeof root === "string"
      ? resolve(root, "docs/requerimientos.md")
      : new URL("docs/requerimientos.md", root),
    "utf8",
  );
  for (const n of [14, 15, 16, 17, 18, 19])
    assert.match(r, new RegExp("\\| PC-" + n + " \\|[^\\n]+\\| Pendiente \\|"));
});
