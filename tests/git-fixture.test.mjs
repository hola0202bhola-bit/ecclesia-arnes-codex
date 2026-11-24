import test from "node:test";
import assert from "node:assert/strict";
import { runFixtureGit } from "../scripts/git-fixture.mjs";

const denied = {
  status: 128,
  stdout: "",
  stderr:
    "error: unable to write file .git/objects/ab/" +
    "c".repeat(38) +
    ": Permission denied\n" +
    "error: archivo.ts: failed to insert into database\n" +
    "error: unable to index file 'archivo.ts'\n" +
    "fatal: adding files failed\n",
};
const success = { status: 0, stdout: "", stderr: "" };
function fixture(results, args = ["add", "."], platform = "win32") {
  let calls = 0;
  const reports = [];
  const pauses = [];
  const result = runFixtureGit(
    args,
    { cwd: "fixture" },
    {
      platform,
      spawn: (command, actualArgs, options) => {
        assert.equal(command, "git");
        assert.deepEqual(actualArgs, args);
        assert.equal(options.cwd, "fixture");
        return results[Math.min(calls++, results.length - 1)];
      },
      report: (message) => reports.push(message),
      pause: (ms) => pauses.push(ms),
    },
  );
  return { result, calls, reports, pauses };
}

test("Git temporal: éxito inicial no se repite", () => {
  const run = fixture([success]);
  assert.equal(run.calls, 1);
  assert.equal(run.result.infrastructureRetries, 0);
  assert.deepEqual(run.reports, []);
});

test("Git temporal: rechazo transitorio de objeto repite add y conserva diagnóstico", () => {
  const run = fixture([denied, success]);
  assert.equal(run.calls, 2);
  assert.equal(run.result.status, 0);
  assert.deepEqual(run.pauses, [200]);
  assert.match(run.reports[0], /Permission denied/);
  assert.deepEqual(run.result.diagnostics, run.reports);
});

test("Git temporal: rechazo persistente aborta después de cuatro intentos", () => {
  const run = fixture([denied]);
  assert.equal(run.calls, 4);
  assert.equal(run.result.status, 128);
  assert.equal(run.result.stderr, denied.stderr);
  assert.deepEqual(run.pauses, [200, 400, 800]);
  assert.equal(run.reports.length, 3);
});

test("Git temporal: no repite hook aunque su salida contenga el mismo error", () => {
  const run = fixture([denied, success], ["hook", "run", "pre-commit"]);
  assert.equal(run.calls, 1);
  assert.equal(run.result.status, 128);
});

test("Git temporal: no repite permisos de fuente, índice bloqueado ni error adicional", () => {
  for (const stderr of [
    "error: open('archivo.ts'): Permission denied\n",
    "fatal: Unable to create '.git/index.lock': File exists\n",
    denied.stderr + "error: otro fallo no recuperable\n",
  ]) {
    const run = fixture([{ ...denied, stderr }, success]);
    assert.equal(run.calls, 1);
    assert.equal(run.result.status, 128);
  }
});

test("Git temporal: no repite fuera de Windows ni fallo de inicio del proceso", () => {
  assert.equal(fixture([denied, success], ["add", "."], "linux").calls, 1);
  const error = new Error("spawn bloqueado");
  const run = fixture([{ ...denied, error }, success]);
  assert.equal(run.calls, 1);
  assert.equal(run.result.error, error);
});
