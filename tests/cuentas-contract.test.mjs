import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import Ajv2020 from "ajv/dist/2020.js";
import { checkSecurity } from "../scripts/check-artifacts.mjs";
const root =
  process.env.ECCLESIA_PROJECT ??
  fileURLToPath(new URL("../../proyecto-ecclesia", import.meta.url));
const api = JSON.parse(readFileSync(resolve(root, "openapi.yaml"), "utf8"));
const actual = JSON.parse(
  readFileSync(resolve(root, "docs/api-referencia-revision03.json"), "utf8"),
);
const ajv = new Ajv2020({ strict: false, validateFormats: false });
test("Ecclesia 1.1 contrato impide elegir rol o iglesia en autorregistro", () => {
  checkSecurity(api);
  const s = api.components.schemas.RegistroVisitanteInput;
  assert.equal(
    ajv.validate(s, {
      identificador: "visitante",
      password: "contraseña ficticia larga",
    }),
    true,
  );
  for (const extra of [
    { rol: "COORDINACION" },
    { iglesiaId: "ajena" },
    { activo: true },
  ])
    assert.equal(
      ajv.validate(s, {
        identificador: "visitante",
        password: "contraseña ficticia larga",
        ...extra,
      }),
      false,
    );
  assert.deepEqual(
    api.paths["/auth/registro"].post,
    actual.paths["/auth/registro"].post,
  );
});
test("Ecclesia 1.1 exige sesión y conserva clave adicional en seguimiento", () => {
  for (const [path, item] of Object.entries(api.paths))
    for (const op of Object.values(item))
      if (op.operationId && op["x-roles"]?.includes("AUTENTICADO"))
        assert.deepEqual(op.security, [{ PersonalJWT: [] }], path);
  for (const item of Object.values(api.paths))
    for (const op of Object.values(item))
      if (op.operationId && op["x-roles"]?.includes("SOLICITANTE_AUTENTICADO"))
        assert.deepEqual(op.security, [
          { PersonalJWT: [], SolicitudClave: [] },
        ]);
  assert.ok(
    api.components.schemas.CuentaPersonal.properties.rol.enum.includes(
      "VISITANTE",
    ),
  );
});
test("Ecclesia 1.1 perfil propio con versión y sin identidad o ámbito editables", () => {
  const s = api.components.schemas.PerfilCuentaInput;
  const fields = {
    nombreVisible: null,
    presentacion: null,
    avatar: "templo",
    version: 0,
  };
  assert.equal(ajv.validate(s, fields), true);
  for (const extra of [
    { usuarioId: "ajeno" },
    { rol: "COORDINACION" },
    { iglesiaId: "ajena" },
    { avatar: "https://externo.invalid/avatar" },
    { version: -1 },
  ])
    assert.equal(ajv.validate(s, { ...fields, ...extra }), false);
  for (const method of ["get", "put"])
    assert.deepEqual(
      api.paths["/cuenta/perfil"][method],
      actual.paths["/cuenta/perfil"][method],
    );
});
test("Ecclesia 1.1 gate exige suite, vistas y migración aditiva", async () => {
  if (!existsSync(resolve(root, "src"))) return;
  const { checkProductInputs } = await import("../scripts/check-product.mjs");
  const { sourceFiles } = await import("../scripts/check-architecture.mjs");
  const indexed = new Set(sourceFiles(root));
  // Comprobar el inventario positivo real; las ausencias se ejercitan en la regresión Git.
  assert.ok(checkProductInputs(root).length > 0);
  assert.ok(indexed.has("src/modules/identidad/presentation/cuenta.ts"));
});
