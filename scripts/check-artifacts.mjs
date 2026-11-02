import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { isDeepStrictEqual } from "node:util";
const policy = JSON.parse(
  readFileSync(
    new URL("../stacks/express/ecclesia-security-policy.json", import.meta.url),
    "utf8",
  ),
);
const methods = [
  "get",
  "post",
  "put",
  "patch",
  "delete",
  "head",
  "options",
  "trace",
];
export function checkSecurity(api) {
  if (!isDeepStrictEqual(api.components?.securitySchemes, policy.schemes))
    throw new Error("Esquemas de seguridad distintos de la matriz revisada");
  const found = new Set();
  for (const [path, item] of Object.entries(api.paths))
    for (const [method, op] of Object.entries(item)) {
      if (!methods.includes(method)) continue;
      const key = method.toUpperCase() + " " + path;
      const expected = policy.operations[key];
      if (!expected) throw new Error("Ruta sin política explícita: " + key);
      found.add(key);
      if (
        op.operationId !== expected.operationId ||
        !isDeepStrictEqual(op["x-roles"], expected.roles) ||
        !isDeepStrictEqual(op.security, expected.security)
      )
        throw new Error("Seguridad/roles no coinciden con matriz: " + key);
    }
  for (const key of Object.keys(policy.operations))
    if (!found.has(key)) throw new Error("Falta ruta de matriz: " + key);
}
export function checkArtifacts(project) {
  for (const file of [
    "AGENTS.md",
    "README.md",
    "docs/requerimientos.md",
    "docs/ARCHITECTURE.md",
    "docs/modelo-datos.md",
    "docs/estados-solicitudes.md",
    "docs/diseno-api.md",
    "docs/pendientes-docente.md",
    "docs/plan-incremental.md",
    "docs/bitacora-ia.md",
    "docs/adr/README.md",
    "docs/adr/001.md",
    "docs/adr/002.md",
    "docs/adr/003.md",
    "docs/adr/004.md",
    "docs/adr/005.md",
    "docs/adr/006.md",
    "docs/estado-producto.md",
    "docs/matriz-seguridad-revision02.md",
    "openapi.yaml",
  ]) {
    if (!existsSync(resolve(project, file))) throw new Error("Falta " + file);
    if (!readFileSync(resolve(project, file), "utf8").trim())
      throw new Error("Artefacto vacío: " + file);
  }
  const source = readFileSync(
    resolve(project, "docs/requerimientos.md"),
    "utf8",
  );
  const rf = new Set(
    [...source.matchAll(/^\| (RF-\d+) \|/gm)].map((m) => m[1]),
  );
  const pc = new Set(
    [...source.matchAll(/^\| (PC-\d+) \|/gm)].map((m) => m[1]),
  );
  const api = JSON.parse(
    readFileSync(resolve(project, "openapi.yaml"), "utf8"),
  );
  const covered = new Set();
  checkSecurity(api);
  const ids = new Set();
  for (const [path, item] of Object.entries(api.paths))
    for (const [method, op] of Object.entries(item)) {
      if (!methods.includes(method)) continue;
      if (ids.has(op.operationId)) throw new Error("operationId duplicado");
      ids.add(op.operationId);
      if (!Array.isArray(op.security))
        throw new Error("Seguridad no explícita: " + path);
      for (const r of op["x-requirements"] ?? []) {
        if (!rf.has(r)) throw new Error("RF desconocido " + r);
        covered.add(r);
      }
      for (const p of op["x-pending"] ?? [])
        if (!pc.has(p)) throw new Error("PC desconocida " + p);
    }
  for (const r of rf)
    if (!covered.has(r)) throw new Error("RF sin operación: " + r);
  return { requisitos: rf.size, preguntas: pc.size, operaciones: ids.size };
}
