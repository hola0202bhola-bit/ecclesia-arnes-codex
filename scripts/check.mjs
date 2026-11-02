import { spawnSync } from "node:child_process";
import { resolve, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { readdirSync, existsSync } from "node:fs";
import { validateContract } from "./validate-contract.mjs";
import { checkArtifacts } from "./check-artifacts.mjs";
import { checkArchitecture } from "./check-architecture.mjs";
import { checkProduct, checkProductInputs } from "./check-product.mjs";
const home = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const project = resolve(process.argv[2] ?? "../proyecto-ecclesia");
checkProductInputs(project);
function run(args) {
  const env = { ...process.env, ECCLESIA_PROJECT: project };
  // node:test marks child processes. A real hook spawned by a regression must
  // still execute its own tool tests instead of silently skipping them.
  delete env.NODE_TEST_CONTEXT;
  const result = spawnSync(process.execPath, args, {
    cwd: home,
    stdio: "inherit",
    env,
  });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}
run([
  join(home, "node_modules/eslint/bin/eslint.js"),
  "scripts",
  "tests",
  "stacks/express/dependency-cruiser.cjs",
  "eslint.config.mjs",
]);
run([
  join(home, "node_modules/prettier/bin/prettier.cjs"),
  "--check",
  "scripts",
  "tests",
  "core",
  "stacks",
  "plantilla-proyecto",
  "README.md",
  "CHANGELOG.md",
  "package.json",
  "eslint.config.mjs",
]);
const tests = readdirSync(join(home, "tests"))
  .filter((f) => f.endsWith(".test.mjs"))
  .filter(
    (f) =>
      !process.argv.includes("--index") ||
      !["hook-regression.test.mjs", "product-index.test.mjs"].includes(f),
  )
  .map((f) => join(home, "tests", f));
run(["--test", ...tests]);
await validateContract(join(project, "openapi.yaml"));
if (existsSync(join(project, "docs/api-referencia-revision03.json")))
  await validateContract(join(project, "docs/api-referencia-revision03.json"));
console.log("Contrato estructural validado.");
console.log("Consistencia documental:", checkArtifacts(project));
console.log("Fuentes y arquitectura:", checkArchitecture(project));
function hasCode(folder) {
  if (!existsSync(folder)) return false;
  return readdirSync(folder, { withFileTypes: true }).some((e) =>
    e.isDirectory()
      ? hasCode(join(folder, e.name))
      : /\.(ts|js|mjs|cjs|tsx|jsx)$/.test(e.name),
  );
}
if (hasCode(join(project, "src")))
  console.log("Producto real:", checkProduct(project));
else
  console.log(
    "Sin código de producto: solo se acreditan herramientas y contrato.",
  );
console.log(
  "Gate técnico completado. El alcance funcional consta en docs/estado-producto.md; las pruebas no acreditan aceptación docente.",
);
