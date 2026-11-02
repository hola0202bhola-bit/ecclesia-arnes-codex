import { spawnSync } from "node:child_process";
import {
  mkdtempSync,
  mkdirSync,
  writeFileSync,
  rmSync,
  existsSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
const project = resolve(process.argv[2]);
const home = resolve(dirname(fileURLToPath(import.meta.url)), "..");
function git(args, binary = false) {
  const r = spawnSync("git", args, {
    cwd: project,
    encoding: binary ? undefined : "utf8",
    maxBuffer: 64 * 1024 * 1024,
  });
  if (r.error) throw r.error;
  if (r.status !== 0) throw new Error("Git: " + r.stderr);
  return r.stdout;
}
// Freeze a tree from the actual index (including initial commits, removals and partial edits).
// No stash, reset, checkout, add or commit; the original index/worktree remain untouched.
const tree = git(["write-tree"]).trim();
const temp = mkdtempSync(join(tmpdir(), "ecclesia-index-"));
let files = 0;
const portablePaths = new Map();
try {
  for (const entry of git(["ls-tree", "-rz", "--full-tree", tree])
    .split("\0")
    .filter(Boolean)) {
    const match = /^(\d+) blob ([a-f0-9]+)\t(.+)$/.exec(entry);
    if (!match || !["100644", "100755"].includes(match[1]))
      throw new Error("Solo archivos regulares en snapshot: " + entry);
    const [, , oid, path] = match;
    if (
      path.startsWith("/") ||
      path.includes("\\") ||
      path.split("/").some((p) => p === ".." || p === "." || p.includes(":"))
    )
      throw new Error("Ruta de índice insegura: " + path);
    const parts = path.split("/");
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      if (
        /[<>:"|?*\u0000-\u001f]/.test(part) ||
        /[. ]$/.test(part) ||
        /^(con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i.test(part)
      )
        throw new Error("Ruta no materializable sin pérdida: " + path);
      const prefix = parts.slice(0, i + 1).join("/");
      const key = prefix.toLowerCase();
      if (portablePaths.has(key) && portablePaths.get(key) !== prefix)
        throw new Error("Colisión de rutas de índice: " + prefix);
      portablePaths.set(key, prefix);
    }
    const dest = join(temp, path);
    mkdirSync(dirname(dest), { recursive: true });
    writeFileSync(dest, git(["cat-file", "blob", oid], true));
    if (git(["hash-object", "--no-filters", dest]).trim() !== oid)
      throw new Error("Blob materializado diferente: " + path);
    files++;
  }
  console.log("Snapshot del índice Git (tree, no commit): " + tree);
  console.log("Blobs materializados y cotejados sin filtros: " + files);
  // Rechazar snapshots incompletos antes de instalar sus dependencias.
  // Los snapshots completos conservan íntegro el gate posterior.
  checkProductInputs(temp);
  // Dependencias se instalan por lock en el snapshot, sin scripts de instalación.
  // No se enlazan node_modules del working tree ni se modifica su cliente Prisma.
  if (existsSync(join(temp, "package.json"))) {
    if (!existsSync(join(temp, "package-lock.json")))
      throw new Error("Falta lock de producto en índice");
    const npmCli =
      process.env.npm_execpath ||
      join(dirname(process.execPath), "node_modules/npm/bin/npm-cli.js");
    const installed = spawnSync(
      process.execPath,
      [
        npmCli,
        "ci",
        "--offline",
        "--ignore-scripts",
        "--no-audit",
        "--no-fund",
      ],
      { cwd: temp, stdio: "inherit", windowsHide: true },
    );
    if (installed.error) throw installed.error;
    if (installed.status !== 0)
      throw new Error(
        "Dependencias del índice no disponibles: preparar caché con npm ci en proyecto; no omitir gate",
      );
  }
  const r = spawnSync(
    process.execPath,
    [join(home, "scripts/check.mjs"), temp, "--index"],
    { cwd: home, stdio: "inherit" },
  );
  if (r.error) throw r.error;
  if (git(["write-tree"]).trim() !== tree)
    throw new Error("El índice cambió durante la comprobación; repetir.");
  process.exitCode = r.status ?? 1;
} finally {
  rmSync(temp, { recursive: true, force: true });
}
import { checkProductInputs } from "./check-product.mjs";
