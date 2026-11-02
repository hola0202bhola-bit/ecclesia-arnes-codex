import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
const home = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const cli = join(
  home,
  "node_modules/dependency-cruiser/bin/dependency-cruiser.mjs",
);
const config = join(home, "stacks/express/dependency-cruiser.cjs");
function cruise(files) {
  const dir = mkdtempSync(join(tmpdir(), "ecclesia-arch-"));
  try {
    for (const [p, body] of Object.entries(files)) {
      const f = join(dir, p);
      mkdirSync(dirname(f), { recursive: true });
      writeFileSync(f, body);
    }
    return spawnSync(
      process.execPath,
      [cli, "--config", config, "--output-type", "err-long", "src"],
      { cwd: dir, encoding: "utf8" },
    );
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}
const domain = "export const value = 1;";
test("permite presentación a aplicación a dominio e infraestructura a dominio", () => {
  const result = cruise({
    "src/modules/a/domain/value.js": domain,
    "src/modules/a/application/use.js":
      "import {value} from '../domain/value.js'; export const use = () => value;",
    "src/modules/a/presentation/http.js":
      "import {use} from '../application/use.js'; export const http = () => use();",
    "src/modules/a/infrastructure/repo.js":
      "import {value} from '../domain/value.js'; export const load = () => value;",
  });
  assert.equal(result.status, 0, result.stdout + result.stderr);
});
test("rechaza controlador que usa infraestructura", () => {
  const result = cruise({
    "src/modules/a/infrastructure/repo.js": domain,
    "src/modules/a/presentation/http.js":
      "import {value} from '../infrastructure/repo.js'; export const http = value;",
  });
  assert.notEqual(result.status, 0);
  assert.match(result.stdout + result.stderr, /presentacion-sin-infra/);
});
test("rechaza dominio que importa HTTP", () => {
  const result = cruise({
    "src/modules/a/presentation/http.js": domain,
    "src/modules/a/domain/value.js":
      "import {value} from '../presentation/http.js'; export const bad = value;",
  });
  assert.notEqual(result.status, 0);
  assert.match(result.stdout + result.stderr, /dominio-puro/);
});
test("rechaza importación interna de otro módulo", () => {
  const result = cruise({
    "src/modules/b/domain/value.js": domain,
    "src/modules/a/application/use.js":
      "import {value} from '../../b/domain/value.js'; export const use = value;",
  });
  assert.notEqual(result.status, 0);
  assert.match(result.stdout + result.stderr, /modulo-aislado-a/);
});
test("rechaza ciclos de dominio", () => {
  const result = cruise({
    "src/modules/a/domain/one.js":
      "import {two} from './two.js'; export const one = () => two;",
    "src/modules/a/domain/two.js":
      "import {one} from './one.js'; export const two = () => one;",
  });
  assert.notEqual(result.status, 0);
  assert.match(result.stdout + result.stderr, /sin-ciclos/);
});
