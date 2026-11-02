import test from "node:test";
import assert from "node:assert/strict";
import {
  cpSync,
  mkdtempSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
  rmSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
const home = fileURLToPath(new URL("..", import.meta.url));
const source =
  process.env.ECCLESIA_PROJECT ??
  fileURLToPath(new URL("../../proyecto-ecclesia", import.meta.url));
test(
  "H02/H03 índice de producto: positivo y cuatro fallos preparados sin usar working tree",
  { timeout: 600000 },
  () => {
    const root = mkdtempSync(join(tmpdir(), "ecclesia-product-index-"));
    const repo = join(root, "project");
    const logs = [];
    function exec(args) {
      const r = spawnSync("git", args, {
        cwd: repo,
        encoding: "utf8",
        maxBuffer: 64 * 1024 * 1024,
        windowsHide: true,
      });
      if (r.error) throw r.error;
      return r;
    }
    function ok(r) {
      assert.equal(r.status, 0, r.stdout + r.stderr);
      return r.stdout;
    }
    function hook(label, expected, pattern) {
      const before = ok(exec(["ls-files", "--stage", "-z"]));
      const state = ok(exec(["status", "--porcelain", "-z"]));
      const tree = ok(exec(["write-tree"])).trim();
      const r = exec(["hook", "run", "pre-commit"]);
      const output = r.stdout + r.stderr;
      logs.push({
        label,
        command: "git hook run pre-commit",
        tree,
        exit: r.status,
        output,
        indexPreserved: ok(exec(["ls-files", "--stage", "-z"])) === before,
        workingTreePreserved:
          ok(exec(["status", "--porcelain", "-z"])) === state,
      });
      assert.equal(logs.at(-1).indexPreserved, true);
      assert.equal(logs.at(-1).workingTreePreserved, true);
      assert.equal(r.status === 0, expected, output);
      assert.match(output, pattern);
      assert.doesNotMatch(output, /recursively.*skipping/);
      if (expected) {
        assert.ok(Number(output.match(/\btests (\d+)/)?.[1]) >= 64);
        // Conserva Iglesias y exige también identidad, sin fijar un total histórico.
        assert.ok(Number(output.match(/Tests\s+(\d+) passed/)?.[1]) >= 100);
        assert.match(output, /identidad\.test\.ts/);
        assert.match(output, /PostgreSQL real aislado/);
      }
    }
    try {
      cpSync(source, repo, {
        recursive: true,
        filter: (p) =>
          !/[\\/](node_modules|coverage|dist|evidence|\.git|\.githooks)([\\/]|$)/.test(
            p,
          ),
      });
      ok(exec(["init", "--quiet"]));
      ok(exec(["config", "core.autocrlf", "false"]));
      const install = spawnSync(
        process.execPath,
        [join(home, "scripts/install-hook.mjs"), repo],
        { encoding: "utf8", maxBuffer: 8 * 1024 * 1024 },
      );
      ok(install);
      ok(exec(["add", "."]));
      const service = "src/modules/iglesias/application/servicio.ts";
      const original = readFileSync(join(repo, service), "utf8");
      writeFileSync(join(repo, service), "solo invalido en working tree {{{");
      hook(
        "positivo: índice completo válido, working tree inválido",
        true,
        /Producto real/,
      );
      writeFileSync(
        join(repo, service),
        original + '\nconst stagedOnly: number = "staged";\nvoid stagedOnly;\n',
      );
      ok(exec(["add", service]));
      writeFileSync(join(repo, service), original);
      hook(
        "error de tipos staged reparado solo en working tree",
        false,
        /Type 'string' is not assignable to type 'number'/,
      );
      ok(exec(["add", service]));
      const testPath = "tests/iglesias.test.ts";
      const tests = readFileSync(join(repo, testPath), "utf8");
      ok(exec(["rm", "--cached", "-f", testPath]));
      hook(
        "pruebas eliminadas del índice pero presentes en disco",
        false,
        /Pipeline de producto incompleto: falta tests/,
      );
      ok(exec(["add", testPath]));
      const identidadPath = "tests/identidad.test.ts";
      ok(exec(["rm", "--cached", "-f", identidadPath]));
      hook(
        "identidad eliminada del índice pero presente en disco",
        false,
        /Pipeline de producto incompleto: falta tests\/identidad/,
      );
      ok(exec(["add", identidadPath]));
      const sqlPath =
        "prisma/migrations/202611010001_referencia_iglesias/migration.sql";
      const sql = readFileSync(join(repo, sqlPath), "utf8");
      writeFileSync(join(repo, sqlPath), "ESTA MIGRACION ES INVALIDA;\n");
      ok(exec(["add", sqlPath]));
      writeFileSync(join(repo, sqlPath), sql);
      hook(
        "migración staged rota con working tree reparado",
        false,
        /syntax error|P3018/i,
      );
      ok(exec(["add", sqlPath]));
      const pkgPath = join(repo, "package.json");
      const pkg = JSON.parse(readFileSync(pkgPath, "utf8"));
      pkg.scripts.test = 'node -e "process.exit(0)"';
      writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + "\n");
      ok(exec(["add", "package.json"]));
      writeFileSync(
        join(repo, testPath),
        tests +
          '\nit("fallo preparado no omitible por script test", () => { expect(2).toBe(3); });\n',
      );
      // Usar Prettier para que el rechazo sea del test real, no del formato.
      const prettier = spawnSync(
        process.execPath,
        [
          join(source, "node_modules/prettier/bin/prettier.cjs"),
          "--write",
          testPath,
        ],
        { cwd: repo, encoding: "utf8" },
      );
      ok(prettier);
      ok(exec(["add", testPath]));
      writeFileSync(join(repo, testPath), tests);
      hook(
        "test staged fallido aunque package test retorna cero",
        false,
        /fallo preparado no omitible|expected 2 to be 3/,
      );
    } finally {
      if (process.env.ECCLESIA_HOOK_EVIDENCE_DIR) {
        mkdirSync(process.env.ECCLESIA_HOOK_EVIDENCE_DIR, { recursive: true });
        writeFileSync(
          join(process.env.ECCLESIA_HOOK_EVIDENCE_DIR, "product-index.json"),
          JSON.stringify(logs, null, 2),
        );
      }
      rmSync(root, { recursive: true, force: true });
    }
  },
);
