import { spawnSync } from "node:child_process";
import { readdirSync, lstatSync, existsSync } from "node:fs";
import { resolve, join, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
const home = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const code = /\.(?:[cm]?[jt]s|[jt]sx)$/;
const legal =
  /^src\/(?:modules\/[^/]+\/(?:domain|application|presentation|infrastructure)|shared\/(?:domain|application|presentation|infrastructure)|composition)\/.+/;
export function sourceFiles(project) {
  const files = [];
  function walk(rel) {
    const abs = join(project, rel);
    if (!existsSync(abs)) return;
    for (const entry of readdirSync(abs, { withFileTypes: true })) {
      const p = rel + "/" + entry.name;
      if (lstatSync(join(project, p)).isSymbolicLink())
        throw new Error("Fuente enlazada no permitida: " + p);
      if (entry.isDirectory()) walk(p);
      else if (code.test(p)) files.push(p);
    }
  }
  walk("src");
  return files.sort();
}
export function assertAnalyzed(expected, graph) {
  const seen = new Set(graph.modules?.map((m) => m.source));
  const missing = expected.filter((p) => !seen.has(p));
  if (missing.length)
    throw new Error(
      "Fuentes omitidas por dependency-cruiser: " + missing.join(", "),
    );
}
export function checkArchitecture(project) {
  project = resolve(project);
  const expected = sourceFiles(project);
  for (const file of expected)
    if (!legal.test(file))
      throw new Error("Capa/carpeta no permitida: " + file);
  if (!expected.length) return { expected: 0, analyzed: 0, violations: 0 };
  const r = spawnSync(
    process.execPath,
    [
      join(home, "node_modules/dependency-cruiser/bin/dependency-cruiser.mjs"),
      "--config",
      join(home, "stacks/express/dependency-cruiser.cjs"),
      "--output-type",
      "json",
      "src",
    ],
    { cwd: project, encoding: "utf8", maxBuffer: 32 * 1024 * 1024 },
  );
  if (r.error) throw r.error;
  let graph;
  try {
    graph = JSON.parse(r.stdout);
  } catch {
    throw new Error("dependency-cruiser no produjo grafo JSON: " + r.stderr);
  }
  assertAnalyzed(expected, graph);
  if (r.status !== 0 || graph.summary?.violations?.length)
    throw new Error(
      "Arquitectura inválida: " +
        JSON.stringify(graph.summary?.violations) +
        r.stderr,
    );
  return {
    expected: expected.length,
    analyzed: graph.modules.filter((m) => expected.includes(m.source)).length,
    violations: 0,
  };
}
if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href
)
  console.log(checkArchitecture(process.argv[2] ?? "."));
