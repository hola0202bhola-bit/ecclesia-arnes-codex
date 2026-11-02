import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import {
  mkdtempSync,
  cpSync,
  readFileSync,
  writeFileSync,
  mkdirSync,
  rmSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";
const home = fileURLToPath(new URL("..", import.meta.url));
const source =
  process.env.ECCLESIA_PROJECT ??
  fileURLToPath(new URL("../../proyecto-ecclesia", import.meta.url));
function exec(cwd, cmd, args) {
  const r = spawnSync(cmd, args, {
    cwd,
    encoding: "utf8",
    maxBuffer: 32 * 1024 * 1024,
  });
  if (r.error) throw r.error;
  return r;
}
function ok(r) {
  assert.equal(r.status, 0, r.stdout + r.stderr);
  return r.stdout;
}
function fixture(action) {
  const root = mkdtempSync(join(tmpdir(), "ecclesia-hook-"));
  const repo = join(root, "project");
  try {
    cpSync(source, repo, {
      recursive: true,
      filter: (p) =>
        !p.includes(".git") &&
        !/[\\/](node_modules|coverage|dist|evidence)([\\/]|$)/.test(p),
    });
    // Los doce escenarios históricos prueban herramientas/contrato sin producto.
    // El índice de producto completo tiene su propia suite y pipeline real.
    for (const path of [
      "src",
      "tests",
      "prisma",
      "scripts",
      "package.json",
      "package-lock.json",
      "tsconfig.json",
      "tsconfig.build.json",
      "vitest.config.ts",
      "prisma.config.ts",
      "eslint.config.mjs",
      "views",
    ])
      rmSync(join(repo, path), { recursive: true, force: true });
    ok(exec(repo, "git", ["init", "--quiet"]));
    ok(exec(repo, "git", ["config", "core.autocrlf", "false"]));
    ok(
      exec(repo, process.execPath, [
        join(home, "scripts/install-hook.mjs"),
        repo,
      ]),
    );
    ok(exec(repo, "git", ["add", "."]));
    const git = (args) => exec(repo, "git", args);
    const put = (p, b) => {
      mkdirSync(dirname(join(repo, p)), { recursive: true });
      writeFileSync(join(repo, p), b);
    };
    const hook = () => {
      const before = ok(git(["ls-files", "--stage", "-z"]));
      const status = ok(git(["status", "--porcelain", "-z"]));
      const r = git(["hook", "run", "pre-commit"]);
      assert.doesNotMatch(
        r.stdout + r.stderr,
        /recursively.*skipping/,
        "Las pruebas internas del hook se omitieron",
      );
      if (r.status === 0)
        assert.match(
          r.stdout + r.stderr,
          /tests (?:6[4-9]|[7-9]\d|\d{3,})/,
          "El hook positivo debe ejecutar todas sus pruebas no recursivas",
        );
      assert.equal(
        ok(git(["ls-files", "--stage", "-z"])),
        before,
        "El hook alteró staging",
      );
      assert.equal(
        ok(git(["status", "--porcelain", "-z"])),
        status,
        "El hook alteró working tree",
      );
      if (process.env.ECCLESIA_HOOK_EVIDENCE_DIR) {
        const dir = process.env.ECCLESIA_HOOK_EVIDENCE_DIR;
        mkdirSync(dir, { recursive: true });
        writeFileSync(
          join(
            dir,
            createHash("sha256").update(repo).digest("hex").slice(0, 16) +
              ".json",
          ),
          JSON.stringify(
            {
              command: "git hook run pre-commit",
              exit: r.status,
              stdout: r.stdout,
              stderr: r.stderr,
              indexEntriesUnchanged: true,
              statusUnchanged: true,
              commitsCreated: 0,
            },
            null,
            2,
          ) + "\n",
        );
      }
      return r;
    };
    return action({ root, repo, git, put, hook });
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}
test("H03 índice válido permite hook real, sin commit", () =>
  fixture(({ hook }) => ok(hook())));
test("H03 rechaza TS inválido staged aunque se elimine solo de working tree", () =>
  fixture(({ repo, put, git, hook }) => {
    put("src/modules/a/domain/invalid.ts", "esto no es TypeScript {{{");
    ok(git(["add", "src"]));
    rmSync(join(repo, "src"), { recursive: true });
    assert.match(
      ok(git(["show", ":src/modules/a/domain/invalid.ts"])),
      /esto no/,
    );
    const r = hook();
    assert.notEqual(r.status, 0);
    assert.match(
      r.stdout + r.stderr,
      /código de producto|Arquitectura inválida|Pipeline de producto incompleto/,
    );
  }));
test("H03 rechaza contrato staged roto aunque working tree válido (edición parcial)", () =>
  fixture(({ repo, put, git, hook }) => {
    const original = readFileSync(join(repo, "openapi.yaml"), "utf8");
    const api = JSON.parse(original);
    api.paths["/iglesias"].get.responses["200"].content[
      "application/json"
    ].schema = { $ref: "#/components/schemas/NoExiste" };
    put("openapi.yaml", JSON.stringify(api));
    ok(git(["add", "openapi.yaml"]));
    put("openapi.yaml", original);
    const r = hook();
    assert.notEqual(r.status, 0);
    assert.match(r.stdout + r.stderr, /NoExiste|Missing.*ref/);
    assert.equal(readFileSync(join(repo, "openapi.yaml"), "utf8"), original);
  }));
test("H03 rechaza eliminación staged de ADR aunque working tree lo conserve", () =>
  fixture(({ repo, git, hook }) => {
    const original = readFileSync(join(repo, "docs/adr/001.md"), "utf8");
    ok(git(["rm", "--cached", "-f", "docs/adr/001.md"]));
    const r = hook();
    assert.notEqual(r.status, 0);
    assert.match(r.stdout + r.stderr, /Falta docs\/adr\/001.md/);
    assert.equal(readFileSync(join(repo, "docs/adr/001.md"), "utf8"), original);
  }));
test("H03 acepta índice válido aunque contrato working tree sea inválido", () =>
  fixture(({ put, hook }) => {
    put("openapi.yaml", "contrato roto solo sin staging");
    ok(hook());
  }));
test("H03 eliminación staged de fuente respeta índice aunque fuente inválida exista en working tree", () =>
  fixture(({ put, git, hook }) => {
    put("src/modules/a/domain/invalid.ts", "inválido {{{");
    ok(git(["add", "src"]));
    ok(git(["rm", "--cached", "-f", "src/modules/a/domain/invalid.ts"]));
    ok(hook());
  }));
test("H03 rechaza contrato staged con ruta privada expuesta y working tree reparado", () =>
  fixture(({ repo, put, git, hook }) => {
    const original = readFileSync(join(repo, "openapi.yaml"), "utf8");
    const api = JSON.parse(original);
    api.paths["/iglesias/{iglesiaId}/reportes/diezmos"].get.security = [];
    put("openapi.yaml", JSON.stringify(api));
    ok(git(["add", "openapi.yaml"]));
    put("openapi.yaml", original);
    const r = hook();
    assert.notEqual(r.status, 0);
    assert.match(r.stdout + r.stderr, /matriz/);
  }));
test("H03 rechaza cambio del arnés posterior a instalar versión fijada", () =>
  fixture(({ root, repo, git }) => {
    // Isolated harness copy; node_modules is unnecessary because the guard rejects before imports.
    const copy = join(root, "harness");
    cpSync(home, copy, {
      recursive: true,
      filter: (p) =>
        !p.split(/[\\/]/).includes("node_modules") &&
        !p.split(/[\\/]/).includes(".git"),
    });
    rmSync(join(repo, ".githooks/pre-commit"));
    ok(
      exec(repo, process.execPath, [
        join(copy, "scripts/install-hook.mjs"),
        repo,
      ]),
    );
    writeFileSync(join(copy, "scripts/check.mjs"), "process.exit(0);");
    const r = git(["hook", "run", "pre-commit"]);
    assert.notEqual(r.status, 0);
    assert.match(r.stdout + r.stderr, /Arnés distinto/);
  }));
test("H03 instalador conserva hook ajeno aun con --refresh", () =>
  fixture(({ repo }) => {
    const body = "#!/bin/sh\necho hook-alumno\n";
    writeFileSync(join(repo, ".githooks/pre-commit"), body);
    const r = exec(repo, process.execPath, [
      join(home, "scripts/install-hook.mjs"),
      repo,
      "--refresh",
    ]);
    assert.notEqual(r.status, 0);
    assert.equal(
      readFileSync(join(repo, ".githooks/pre-commit"), "utf8"),
      body,
    );
  }));
test("H03 instalador no desactiva hook en ubicación Git predeterminada", () =>
  fixture(({ repo, git }) => {
    ok(git(["config", "--unset", "core.hooksPath"]));
    const dest = join(repo, ".git/hooks/pre-commit");
    const body = "#!/bin/sh\necho alumno\n";
    writeFileSync(dest, body);
    const r = exec(repo, process.execPath, [
      join(home, "scripts/install-hook.mjs"),
      repo,
    ]);
    assert.notEqual(r.status, 0);
    assert.equal(readFileSync(dest, "utf8"), body);
    assert.equal(git(["config", "--get", "core.hooksPath"]).status, 1);
  }));
test("H03 rechaza entradas de índice no materializables por colisión de mayúsculas", () =>
  fixture(({ git, hook }) => {
    const oid = ok(git(["rev-parse", ":README.md"])).trim();
    ok(
      git([
        "-c",
        "core.ignorecase=false",
        "update-index",
        "--add",
        "--cacheinfo",
        "100644",
        oid,
        "README.MD",
      ]),
    );
    const r = hook();
    assert.notEqual(r.status, 0);
    assert.match(r.stdout + r.stderr, /Colisión de rutas/);
  }));
test("H03 rechaza enlace preparado sin leer un destino externo", () =>
  fixture(({ git, hook }) => {
    const oid = ok(git(["rev-parse", ":README.md"])).trim();
    ok(
      git([
        "update-index",
        "--add",
        "--cacheinfo",
        "120000",
        oid,
        "external-link",
      ]),
    );
    const r = hook();
    assert.notEqual(r.status, 0);
    assert.match(r.stdout + r.stderr, /Solo archivos regulares/);
  }));
