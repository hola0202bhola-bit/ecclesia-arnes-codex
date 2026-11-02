import { resolve, dirname, relative } from "node:path";
import { fileURLToPath } from "node:url";
import {
  existsSync,
  readFileSync,
  mkdirSync,
  writeFileSync,
  chmodSync,
  statSync,
} from "node:fs";
import { spawnSync } from "node:child_process";
import { fingerprint } from "./harness-fingerprint.mjs";
let repo = resolve(process.argv[2] ?? "");
if (!process.argv[2]) throw new Error("Indica un repositorio objetivo.");
function git(args) {
  const r = spawnSync("git", args, { cwd: repo, encoding: "utf8" });
  if (r.error) throw r.error;
  return r;
}
const top = git(["rev-parse", "--show-toplevel"]);
if (
  top.status !== 0 ||
  statSync(resolve(top.stdout.trim())).ino !== statSync(repo).ino ||
  statSync(resolve(top.stdout.trim())).dev !== statSync(repo).dev
)
  throw new Error(
    "La ruta debe ser raíz de un repositorio Git independiente. " +
      top.stderr +
      " Git=" +
      top.stdout.trim() +
      " ruta=" +
      repo,
  );
repo = resolve(top.stdout.trim());
const old = git(["config", "--get", "core.hooksPath"]);
if (old.status === 0 && old.stdout.trim() !== ".githooks")
  throw new Error("Existe core.hooksPath distinto; revisar sin sobrescribir.");
if (old.status !== 0) {
  const previous = git(["rev-parse", "--git-path", "hooks/pre-commit"]);
  if (
    previous.status === 0 &&
    existsSync(resolve(repo, previous.stdout.trim()))
  )
    throw new Error("Existe un pre-commit en hooks de Git; no se desactiva.");
}
const home = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const rel = relative(repo, home).replaceAll("\\", "/");
const quote = (text) => "'" + text.replaceAll("'", "'\"'\"'") + "'";
const bootstrap = `
import {readdirSync, readFileSync, lstatSync} from 'node:fs';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
const [repo, home] = process.argv.slice(1);
${fingerprint.toString()}
const expected = ${JSON.stringify(fingerprint(home))};
if (JSON.stringify(fingerprint(home)) !== JSON.stringify(expected)) throw new Error('Arnés distinto del revisado al instalar hook. Revisar cambios, ejecutar check y reinstalar explícitamente.');
const result = spawnSync(process.execPath, [join(home,'scripts/check-index.mjs'),repo], {stdio:'inherit'});
if (result.error) throw result.error;
process.exit(result.status ?? 1);
`;
const hook =
  '#!/bin/sh\n# Ecclesia index hook v0.2\nset -eu\nrepo=$(git rev-parse --show-toplevel)\nharness=$(cd "$repo" && cd ' +
  quote(rel) +
  " && pwd)\nnode --input-type=module -e " +
  quote(bootstrap) +
  ' -- "$repo" "$harness"\n';
const dest = resolve(repo, ".githooks/pre-commit");
if (
  existsSync(dest) &&
  readFileSync(dest, "utf8") !== hook &&
  !(
    process.argv.includes("--refresh") &&
    readFileSync(dest, "utf8").startsWith(
      "#!/bin/sh\n# Ecclesia index hook v0.2\n",
    )
  )
)
  throw new Error(
    "Hay pre-commit diferente; no se reemplaza. Tras revisión explícita usar --refresh solo para este hook.",
  );
mkdirSync(dirname(dest), { recursive: true });
writeFileSync(dest, hook);
chmodSync(dest, 0o755);
const configured = git(["config", "--local", "core.hooksPath", ".githooks"]);
if (configured.status !== 0) throw new Error(configured.stderr);
console.log(
  "Hook inicial instalado localmente. Ejecutar git hook run pre-commit; no se realizó commit.",
);
