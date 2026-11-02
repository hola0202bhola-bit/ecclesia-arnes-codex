import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import {
  checkArchitecture,
  assertAnalyzed,
} from "../scripts/check-architecture.mjs";
function fixture(files, run) {
  const dir = mkdtempSync(join(tmpdir(), "ecclesia-ts-"));
  try {
    for (const [p, b] of Object.entries(files)) {
      mkdirSync(dirname(join(dir, p)), { recursive: true });
      writeFileSync(join(dir, p), b);
    }
    return run(dir);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}
const value = "export const value: number = 1;";
test("H04 TypeScript válido analiza exactamente las dos fuentes, incluida aislada", () =>
  fixture(
    {
      "src/modules/a/domain/value.ts": value,
      "src/modules/a/domain/isolated.ts": "export type Id = string;",
    },
    (dir) =>
      assert.deepEqual(checkArchitecture(dir), {
        expected: 2,
        analyzed: 2,
        violations: 0,
      }),
  ));
test("H04 rechaza dependencia TypeScript de dominio a HTTP (solo tipos)", () =>
  fixture(
    {
      "src/modules/a/domain/value.ts":
        "import type {Http} from '../presentation/http.ts'; export type Bad = Http;",
      "src/modules/a/presentation/http.ts":
        "export interface Http { id: string }",
    },
    (dir) => assert.throws(() => checkArchitecture(dir), /dominio-puro/),
  ));
test("H04 falla ante cero fuentes analizadas o pérdida parcial del inventario", () => {
  assert.throws(
    () => assertAnalyzed(["src/a.ts"], { modules: [] }),
    /omitidas/,
  );
  assert.throws(
    () =>
      assertAnalyzed(["src/a.ts", "src/b.ts"], {
        modules: [{ source: "src/a.ts" }],
      }),
    /b.ts/,
  );
  assert.doesNotThrow(() =>
    assertAnalyzed(["src/a.ts"], { modules: [{ source: "src/a.ts" }] }),
  );
});
for (const layer of ["presentation", "infrastructure"])
  test("H05 rechaza " + layer + " hacia composición", () =>
    fixture(
      {
        "src/composition/root.ts": value,
        ["src/modules/a/" + layer + "/bad.ts"]:
          "import {value} from '../../../composition/root.ts'; export const bad = value;",
      },
      (dir) =>
        assert.throws(
          () => checkArchitecture(dir),
          /composicion-sin-entrantes/,
        ),
    ),
  );
test("H05 rechaza presentación hacia storage no declarado", () =>
  fixture(
    {
      "src/modules/a/storage/repo.ts": value,
      "src/modules/a/presentation/http.ts":
        "import {value} from '../storage/repo.ts'; export const bad=value;",
    },
    (dir) =>
      assert.throws(() => checkArchitecture(dir), /carpeta no permitida/),
  ));
test("H05 rechaza fuente huérfana en carpeta desconocida sin imports", () =>
  fixture({ "src/storage/hidden.ts": value }, (dir) =>
    assert.throws(() => checkArchitecture(dir), /carpeta no permitida/),
  ));
test("H04 no omite fuentes en directorios llamados dist o coverage", () =>
  fixture(
    {
      "src/modules/a/domain/dist/value.ts": value,
      "src/modules/a/domain/coverage/value.ts": value,
    },
    (dir) => assert.equal(checkArchitecture(dir).analyzed, 2),
  ));
test("H05 permite composición e inyección y capas compartidas permitidas", () =>
  fixture(
    {
      "src/modules/a/domain/value.ts": value,
      "src/shared/domain/id.ts": "export type Id=string;",
      "src/modules/a/application/use.ts":
        "import {value} from '../domain/value.ts'; import type {Id} from '../../../shared/domain/id.ts'; export const use = (id:Id)=>id+value;",
      "src/modules/a/presentation/http.ts":
        "import {use} from '../application/use.ts'; export const http=use;",
      "src/modules/a/infrastructure/repo.ts":
        "import {value} from '../domain/value.ts'; export const repo=value;",
      "src/composition/root.ts":
        "import {http} from '../modules/a/presentation/http.ts'; import {repo} from '../modules/a/infrastructure/repo.ts'; export const root=[http,repo];",
    },
    (dir) => assert.equal(checkArchitecture(dir).analyzed, 6),
  ));
