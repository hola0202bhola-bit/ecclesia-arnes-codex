import test from "node:test";
import assert from "node:assert/strict";
import {
  cpSync,
  mkdtempSync,
  rmSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { resolve, join } from "node:path";
import { fileURLToPath } from "node:url";
import { checkArtifacts, checkSecurity } from "../scripts/check-artifacts.mjs";
const project =
  process.env.ECCLESIA_PROJECT ??
  fileURLToPath(new URL("../../proyecto-ecclesia", import.meta.url));
const original = JSON.parse(
  readFileSync(join(project, "openapi.yaml"), "utf8"),
);
test("H11 acepta inventario completo y política original sin ampliar permisos", () =>
  assert.equal(checkArtifacts(project).operaciones, 62));
for (const file of [
  "docs/bitacora-ia.md",
  ...["001", "002", "003", "004", "005"].map((n) => "docs/adr/" + n + ".md"),
])
  test("H11 rechaza ausencia de " + file, () => {
    const dir = mkdtempSync(join(tmpdir(), "ecclesia-artifacts-"));
    try {
      cpSync(project, dir, {
        recursive: true,
        filter: (p) =>
          !p.includes(".git") &&
          !/[\\/](node_modules|coverage|dist|evidence)([\\/]|$)/.test(p),
      });
      rmSync(resolve(dir, file));
      assert.throws(() => checkArtifacts(dir), /Falta/);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
for (const [label, mutate] of [
  ["seguridad vacía", (op) => (op.security = [])],
  ["alternativa anónima", (op) => op.security.push({})],
  [
    "credencial de solicitante para personal",
    (op) => (op.security = [{ SolicitudClave: [] }]),
  ],
  [
    "roles públicos sobre reporte privado",
    (op) => (op["x-roles"] = ["PUBLICO"]),
  ],
  ["seguridad heredada", (op) => delete op.security],
])
  test("H11 rechaza " + label, () => {
    const api = structuredClone(original);
    mutate(api.paths["/iglesias/{iglesiaId}/reportes/diezmos"].get);
    assert.throws(() => checkSecurity(api), /matriz/);
  });
test("H11 rechaza redefinir JWT o credencial de seguimiento", () => {
  const api = structuredClone(original);
  api.components.securitySchemes.PersonalJWT.scheme = "basic";
  assert.throws(() => checkSecurity(api), /Esquemas/);
});
test("H11 rechaza endpoint nuevo sin política incluso HEAD", () => {
  const api = structuredClone(original);
  api.paths["/nuevo"] = {
    head: { operationId: "nuevo", security: [], "x-roles": ["PUBLICO"] },
  };
  assert.throws(() => checkSecurity(api), /sin política/);
});
test("H11 rechaza bitácora vacía", () => {
  const dir = mkdtempSync(join(tmpdir(), "ecclesia-empty-"));
  try {
    cpSync(project, dir, {
      recursive: true,
      filter: (p) =>
        !p.includes(".git") &&
        !/[\\/](node_modules|coverage|dist|evidence)([\\/]|$)/.test(p),
    });
    writeFileSync(join(dir, "docs/bitacora-ia.md"), "");
    assert.throws(() => checkArtifacts(dir), /vacío/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
