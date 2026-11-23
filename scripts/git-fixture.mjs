import { spawnSync } from "node:child_process";

// Only fixture staging may recover from Windows denying finalization of a loose
// object. Never retry hooks, validation failures, source permissions or locks.
export function runFixtureGit(args, options, runtime = {}) {
  const {
    platform = process.platform,
    spawn = spawnSync,
    pause = (ms) =>
      Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms),
    report = (message) => console.error(message),
  } = runtime;
  const diagnostics = [];
  for (let attempt = 0; ; attempt++) {
    const result = spawn("git", args, options);
    const stderr = String(result.stderr ?? "");
    const transient =
      platform === "win32" &&
      args[0] === "add" &&
      !result.error &&
      result.status === 128 &&
      /^error: unable to write file \.git\/objects\/[a-f0-9]{2}\/[a-f0-9]{38}: Permission denied\r?$/m.test(
        stderr,
      ) &&
      stderr
        .split(/\r?\n/)
        .filter((line) => line && !line.startsWith("warning: "))
        .every((line) =>
          /^(error: unable to write file \.git\/objects\/[a-f0-9]{2}\/[a-f0-9]{38}: Permission denied|error: .+: failed to insert into database|error: unable to index file '.+'|fatal: adding files failed)$/.test(
            line,
          ),
        );
    if (!transient || attempt === 3)
      return { ...result, infrastructureRetries: attempt, diagnostics };
    const message =
      `Infraestructura Git temporal: add falló (${attempt + 1}/4); ` +
      "se repetirá solo la preparación, no el hook ni las pruebas.\n" +
      stderr;
    diagnostics.push(message);
    report(message);
    pause(200 * 2 ** attempt);
  }
}
