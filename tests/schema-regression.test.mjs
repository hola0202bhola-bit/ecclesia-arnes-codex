import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { URL } from "node:url";
import Ajv2020 from "ajv/dist/2020.js";
const api = JSON.parse(
  readFileSync(
    process.env.ECCLESIA_PROJECT
      ? resolve(process.env.ECCLESIA_PROJECT, "openapi.yaml")
      : new URL("../../proyecto-ecclesia/openapi.yaml", import.meta.url),
    "utf8",
  ),
);
const schemas = api.components.schemas;
const clone = (value) => JSON.parse(JSON.stringify(value));
const ajv = new Ajv2020({
  strict: false,
  validateFormats: false,
  allErrors: true,
});
ajv.addSchema({ $id: "ecclesia", components: { schemas } });
const validate = (name, data) =>
  ajv.validate({ $ref: `ecclesia#/components/schemas/${name}` }, data);
const id = "00000000-0000-4000-8000-000000000001";
const creates = {
  Usuario: { identificador: "usuario-ficticio" },
  Iglesia: { nombre: "Iglesia ficticia" },
  Objeto: { descripcion: "Objeto ficticio" },
  Servicio: { tipoId: id },
  Platica: { tipoId: id },
  Sacerdote: { nombre: "Padre ficticio" },
  HorarioMisa: { horaLocal: "09:00" },
  Celebracion: { horaLocal: "09:00" },
  Oferta: { tipoEspacioId: id },
};
// Son muestras estructurales. No definen los campos obligatorios pendientes del cliente.
for (const [resource, sample] of Object.entries(creates)) {
  test(`H08-create-${resource}: rechaza alta vacía y admite muestra estructural`, () => {
    assert.equal(validate(`${resource}CreateInput`, {}), false);
    assert.equal(
      validate(`${resource}CreateInput`, sample),
      true,
      JSON.stringify(ajv.errors),
    );
    assert.equal(
      validate(`${resource}CreateInput`, { ...sample, desconocido: true }),
      false,
    );
  });
  test(`H07-patch-${resource}: requiere version y un cambio`, () => {
    assert.equal(validate(`${resource}PatchInput`, sample), false);
    assert.equal(validate(`${resource}PatchInput`, { version: 1 }), false);
    assert.equal(
      validate(`${resource}PatchInput`, { ...sample, version: 1 }),
      true,
      JSON.stringify(ajv.errors),
    );
    assert.equal(
      validate(`${resource}PatchInput`, { ...sample, version: 0 }),
      false,
    );
  });
}
test("H06: consulta anónima declara resumen público de padre y ejemplo válido", () => {
  const operation = api.paths["/iglesias/{iglesiaId}/horarios-misa"].get;
  assert.deepEqual(operation.security, []);
  assert.deepEqual(operation["x-roles"], ["PUBLICO"]);
  const media = operation.responses[200].content["application/json"];
  assert.equal(
    ajv.validate({ ...media.schema, components: { schemas } }, media.example),
    true,
    JSON.stringify(ajv.errors),
  );
  const row = media.example.data[0];
  const withoutName = clone(row);
  delete withoutName.sacerdotePrevisto;
  assert.equal(validate("HorarioMisa", withoutName), false);
  assert.equal(
    validate("HorarioMisa", {
      ...row,
      sacerdotePrevisto: {
        id,
        nombre: "Padre ficticio",
        contactoPrivado: "privado",
      },
    }),
    false,
  );
});
test("H07: lecturas de recursos mutables devuelven version admisible en comandos", () => {
  for (const resource of [
    "Usuario",
    "CatalogItem",
    "Iglesia",
    "Objeto",
    "Servicio",
    "Platica",
    "Sacerdote",
    "HorarioMisa",
    "Oferta",
    "Criterio",
    "Celebracion",
    "Diezmo",
    "Solicitud",
  ]) {
    assert.ok(schemas[resource].required.includes("version"), resource);
    assert.equal(schemas[resource].properties.version.minimum, 1, resource);
  }
  const iglesia = { id, nombre: "Ejemplo ficticio", version: 1 };
  const objeto = { id, version: 1 };
  assert.equal(validate("Iglesia", iglesia), true);
  assert.equal(validate("Objeto", objeto), true);
  assert.equal(
    validate("MotivoInput", {
      motivo: "Ejemplo ficticio",
      version: iglesia.version,
    }),
    true,
  );
  assert.equal(
    validate("CondicionInput", {
      condicion: "PRESTADO",
      version: objeto.version,
    }),
    true,
  );
  // Se prueba la declaración 409. El rechazo real de una versión obsoleta exige H02/BD.
  for (const item of Object.values(api.paths))
    for (const [method, operation] of Object.entries(item)) {
      if (method === "patch") {
        assert.ok(operation.responses[409], operation.operationId);
        assert.ok(
          operation.requestBody.content[
            "application/json"
          ].schema.$ref.endsWith("PatchInput"),
          operation.operationId,
        );
      }
    }
});
test("H07: version de criterios no se confunde con numeroVersionConfiguracion", () => {
  assert.ok(schemas.Criterio.required.includes("numeroVersionConfiguracion"));
  assert.ok(schemas.CriterioUpdateInput.required.includes("version"));
  assert.ok(schemas.CotizacionInput.required.includes("version"));
  assert.equal(schemas.CotizacionInput.properties.versionSolicitud, undefined);
});
for (const name of [
  "HorarioSemanal",
  "HorarioMisaInput",
  "HorarioMisaCreateInput",
  "CelebracionInput",
  "CelebracionCreateInput",
]) {
  test(`H08-clock-${name}: rechaza reloj imposible y admite extremos`, () => {
    const sample = name === "HorarioSemanal" ? { diaSemana: 1 } : {};
    for (const hour of ["00:00", "23:59"])
      assert.equal(validate(name, { ...sample, horaLocal: hour }), true);
    for (const hour of ["99:99", "24:00", "12:60", "9:00"])
      assert.equal(validate(name, { ...sample, horaLocal: hour }), false);
  });
}
const criterio = {
  bonusInah: "2.0",
  tramos: [{ edadDesde: 0, edadHasta: null, puntos: "1.3" }],
  factores: [{ tipoObjetoId: id, factor: "1" }],
  umbrales: [{ minimo: "8", etiqueta: "Ejemplo ficticio" }],
};
test("H08-criterios: decimales y configuraciones no vacías", () => {
  assert.equal(
    validate("CriterioInput", criterio),
    true,
    JSON.stringify(ajv.errors),
  );
  assert.equal(
    validate("CriterioInput", {
      bonusInah: "texto",
      tramos: [],
      factores: [],
      umbrales: [],
    }),
    false,
  );
  for (const field of ["tramos", "factores", "umbrales"])
    assert.equal(
      validate("CriterioInput", { ...criterio, [field]: [] }),
      false,
    );
  for (const field of ["puntos", "factor", "minimo"]) {
    const invalid = clone(criterio);
    const collection = {
      puntos: "tramos",
      factor: "factores",
      minimo: "umbrales",
    }[field];
    invalid[collection][0][field] = "texto";
    assert.equal(validate("CriterioInput", invalid), false);
  }
});
test("H08: texto significativo y duración declarativa de 60 minutos", () => {
  assert.equal(validate("IglesiaCreateInput", { nombre: " " }), false);
  assert.equal(validate("IglesiaCreateInput", { nombre: "" }), false);
  assert.equal(
    schemas.HorarioMisaCreateInput.properties.duracionMinutos.default,
    60,
  );
  assert.equal(
    schemas.HorarioMisaPatchInput.properties.duracionMinutos.default,
    undefined,
  );
  assert.equal(
    validate("HorarioMisaCreateInput", { duracionMinutos: 0 }),
    false,
  );
});
test("H13: índice en ficha exige criterio y referencia temporal sin fijar 2026 en producción", () => {
  const sample = {
    id,
    nombre: "Ejemplo ficticio",
    version: 1,
    indice: "35.5",
    distincion: "Alto valor patrimonial",
    criterioId: id,
    referenciaTemporal: "2026",
  };
  assert.equal(validate("Iglesia", sample), true, JSON.stringify(ajv.errors));
  for (const key of ["criterioId", "referenciaTemporal", "distincion"]) {
    const invalid = { ...sample };
    delete invalid[key];
    assert.equal(validate("Iglesia", invalid), false, key);
  }
  assert.equal(
    validate("Iglesia", { id, nombre: "Ejemplo ficticio", version: 1 }),
    true,
  );
});

test("H07-catalogos: alta y edición usan contratos distintos", () => {
  assert.equal(
    validate("CatalogCreateInput", {
      id: "clave-ficticia",
      nombre: "Nombre ficticio",
    }),
    true,
  );
  assert.equal(
    validate("CatalogPatchInput", { nombre: "Nombre ficticio" }),
    false,
  );
  assert.equal(validate("CatalogPatchInput", { version: 1 }), false);
  assert.equal(
    validate("CatalogPatchInput", { version: 1, nombre: "Nombre ficticio" }),
    true,
  );
  assert.equal(validate("CriterioUpdateInput", criterio), false);
  assert.equal(
    validate("CriterioUpdateInput", { ...criterio, version: 1 }),
    true,
  );
});
