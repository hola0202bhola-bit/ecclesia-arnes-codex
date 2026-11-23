import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import Ajv2020 from "ajv/dist/2020.js";

const root =
  process.env.ECCLESIA_PROJECT ??
  fileURLToPath(new URL("../../proyecto-ecclesia", import.meta.url));
const nombres = [
  "Iglesia",
  "IglesiaInput",
  "IglesiaCreateInput",
  "IglesiaPatchInput",
  "IglesiaReferenciaCreateInput",
  "IglesiaReferenciaPatchInput",
];
const contratos = ["openapi.yaml", "docs/api-referencia-revision03.json"].map(
  (archivo) => ({
    archivo,
    api: JSON.parse(readFileSync(resolve(root, archivo), "utf8")),
  }),
);
const ajv = new Ajv2020({ strict: false, validateFormats: false });

test("ficha escolar: seis esquemas de ambos contratos rechazan fotos inseguras y descripción solo blanca", () => {
  for (const { archivo, api } of contratos)
    for (const nombre of nombres) {
      const foto = ajv.compile(
        api.components.schemas[nombre].properties.fotoUrl,
      );
      const descripcion = ajv.compile(
        api.components.schemas[nombre].properties.descripcion,
      );
      for (const valor of [
        "http://example.org/a.jpg",
        "javascript:alert(1)",
        "https://usuario:clave@example.org/a.jpg",
        "https://example.org/a.jpg#",
        "https://127.0.0.1/a.jpg",
        "https://[::1]/a.jpg",
        "https://localhost/a.jpg",
        "https://sub.foto.LOCAL./a.jpg",
        "https://foto.internal/a.jpg",
        "https://foto.invalid/a.jpg",
        "https://foto.test/a.jpg",
        "https://foto.example/a.jpg",
        "https://foto.onion/a.jpg",
        "https://example.org:65536/a.jpg",
        "",
        "   ",
      ])
        assert.equal(foto(valor), false, `${archivo}/${nombre}: ${valor}`);
      for (const valor of ["", "   ", "\t\n", "\u00a0\u2003", "x".repeat(501)])
        assert.equal(
          descripcion(valor),
          false,
          `${archivo}/${nombre}: descripción inválida`,
        );
    }
});

test("ficha escolar: HTTPS válida, null y opcionalidad se conservan; contratos tienen restricciones iguales", () => {
  for (const nombre of nombres) {
    const primero = contratos[0].api.components.schemas[nombre];
    const segundo = contratos[1].api.components.schemas[nombre];
    for (const campo of ["fotoUrl", "descripcion"]) {
      assert.deepEqual(primero.properties[campo], segundo.properties[campo]);
      for (const schema of [primero, segundo]) {
        assert.equal((schema.required ?? []).includes(campo), false);
        assert.equal(ajv.validate(schema.properties[campo], null), true);
      }
    }
    for (const schema of [primero, segundo]) {
      for (const valor of [
        "https://example.org",
        "HTTPS://FOTO.EXAMPLE.ORG/a.jpg",
        "https://sub-dominio.example.org.:443/a.jpg?v=1",
        "https://example.org:65535/a.jpg",
        "https://mañana.example.org/a.jpg",
        " https://example.org/a.jpg ",
      ])
        assert.equal(
          ajv.validate(schema.properties.fotoUrl, valor),
          true,
          nombre,
        );
      assert.equal(
        ajv.validate(schema.properties.descripcion, "Descripción ficticia"),
        true,
      );
      assert.equal(
        ajv.validate(schema.properties.descripcion, "x".repeat(500)),
        true,
      );
      assert.ok(schema.properties.fotoUrl.description.includes("WHATWG/IDNA"));
      assert.ok(schema.properties.fotoUrl.description.includes("UTF-16"));
    }
  }
});
