import { existsSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { sourceFiles } from "./check-architecture.mjs";
export function checkProductInputs(project) {
  project = resolve(project);
  const files = sourceFiles(project);
  if (!files.length) return files;
  for (const required of [
    "package.json",
    "package-lock.json",
    "prisma/schema.prisma",
    "prisma/seed.ts",
    "prisma/fuentes/inegi-localidad.json",
    "tests/iglesias.test.ts",
    "tests/identidad.test.ts",
    "tests/gestion-iglesias.test.ts",
    "tests/patrimonio.test.ts",
    "tests/servicios.test.ts",
    "prisma/migrations/202611020002_servicios/migration.sql",
    "views/oferta.ejs",
    "views/oferta-formulario.ejs",
    "prisma/migrations/202611020001_patrimonio/migration.sql",
    "views/patrimonio.ejs",
    "views/objeto-formulario.ejs",
    "views/ranking-patrimonial.ejs",
    "prisma/fuentes/manifest.json",
    "prisma/fuentes/inegi-estados.json",
    ...Array.from(
      { length: 32 },
      (_, i) =>
        `prisma/fuentes/inegi-municipios-${String(i + 1).padStart(2, "0")}.json`,
    ),
    "prisma/migrations/202611010003_catalogos/migration.sql",
    "views/gestion-iglesias.ejs",
    "views/iglesia-formulario.ejs",
    "views/error.ejs",
    "prisma/migrations/202611010002_identidad/migration.sql",
    "views/login.ejs",
    "views/personal.ejs",
    "views/usuarios.ejs",
    "views/iglesias.ejs",
    "views/ficha.ejs",
    "docs/api-referencia-revision03.json",
  ])
    if (!existsSync(join(project, required)))
      throw new Error("Pipeline de producto incompleto: falta " + required);
  return files;
}
export function checkProduct(project) {
  project = resolve(project);
  const files = checkProductInputs(project);
  if (!files.length) return { implemented: false };
  if (!existsSync(join(project, "node_modules/typescript/bin/tsc")))
    throw new Error(
      "Instalar dependencias de producto con npm ci antes del check",
    );
  const env = { ...process.env };
  delete env.NODE_TEST_CONTEXT;
  function run(args) {
    const r = spawnSync(process.execPath, args, {
      cwd: project,
      env,
      stdio: "inherit",
      windowsHide: true,
    });
    if (r.error) throw r.error;
    if (r.status !== 0)
      throw new Error("Pipeline de producto rechazado: " + args[0]);
  }
  // Comandos fijados por el arnés; no ejecutar scripts de package.json que puedan saltarse el gate.
  run(["node_modules/prisma/build/index.js", "generate"]);
  run([
    "node_modules/typescript/bin/tsc",
    "--noEmit",
    "--strict",
    "--skipLibCheck",
    "--esModuleInterop",
    "--target",
    "ES2023",
    "--module",
    "NodeNext",
    "--moduleResolution",
    "NodeNext",
    ...files,
    "tests/iglesias.test.ts",
    "tests/identidad.test.ts",
    "tests/gestion-iglesias.test.ts",
    "tests/patrimonio.test.ts",
    "tests/servicios.test.ts",
    "prisma/seed.ts",
  ]);
  run(["node_modules/eslint/bin/eslint.js", "src", "tests", "prisma/seed.ts"]);
  run([
    "node_modules/prettier/bin/prettier.cjs",
    "--check",
    "src",
    "tests",
    "prisma/seed.ts",
    "scripts",
    "package.json",
    "package-lock.json",
    "tsconfig.json",
    "tsconfig.build.json",
    "vitest.config.ts",
    "prisma.config.ts",
    "eslint.config.mjs",
  ]);
  run([
    "node_modules/typescript/bin/tsc",
    "--strict",
    "--skipLibCheck",
    "--esModuleInterop",
    "--target",
    "ES2023",
    "--module",
    "NodeNext",
    "--moduleResolution",
    "NodeNext",
    "--outDir",
    "dist",
    "--rootDir",
    "src",
    ...files,
  ]);
  run([fileURLToPath(new URL("./run-product-tests.mjs", import.meta.url))]);
  const report = JSON.parse(
    readFileSync(join(project, "evidence/vitest.json"), "utf8"),
  );
  if (
    !report.success ||
    report.numPassedTests < 1 ||
    report.numFailedTests ||
    report.numPendingTests
  )
    throw new Error("Reporte de pruebas de producto inválido/vacío/omitido");
  for (const [suite, minimum] of [
    ["iglesias.test.ts", 70],
    ["identidad.test.ts", 30],
    ["gestion-iglesias.test.ts", 49],
    ["patrimonio.test.ts", 80],
    ["servicios.test.ts", 1],
  ]) {
    const result = report.testResults?.find((r) =>
      r.name.replaceAll("\\", "/").endsWith("/tests/" + suite),
    );
    if (
      !result ||
      result.assertionResults.filter((r) => r.status === "passed").length <
        minimum
    )
      throw new Error("Suite obligatoria incompleta: " + suite);
  }
  const patrimonio = report.testResults.find((r) =>
    r.name.replaceAll("\\", "/").endsWith("/tests/patrimonio.test.ts"),
  );
  for (const regla of [
    "reproduce exactamente P074",
    "dos cambios simultáneos",
    "fallo de auditoría",
    "misma pieza vigente",
    "CSRF",
    "actualiza esquema previo",
  ]) {
    if (
      !patrimonio.assertionResults.some(
        (r) => r.status === "passed" && r.fullName.includes(regla),
      )
    )
      throw new Error("Regresión patrimonial obligatoria ausente: " + regla);
  }
  const oferta = report.testResults.find((r) =>
    r.name.replaceAll("\\", "/").endsWith("/tests/servicios.test.ts"),
  );
  for (const regla of [
    "mismo tipo admite fijo, gratuito y donativo",
    "servicios: dos cambios simultáneos",
    "platicas: dos cambios simultáneos",
    "fallo de auditoría revierte",
    "CSRF/Origin",
    "escape de HTML",
    "actualiza esquema previo",
  ]) {
    if (
      !oferta.assertionResults.some(
        (r) => r.status === "passed" && r.fullName.includes(regla),
      )
    )
      throw new Error("Regresión de oferta obligatoria ausente: " + regla);
  }
  const coverage = JSON.parse(
    readFileSync(join(project, "coverage/coverage-summary.json"), "utf8"),
  );
  const measured = files.filter((file) => file !== "src/composition/server.ts");
  for (const file of measured) {
    if (
      !Object.keys(coverage).some((key) =>
        key.replaceAll("\\", "/").endsWith("/" + file),
      )
    )
      throw new Error("Fuente sin cobertura: " + file);
  }
  for (const metric of ["lines", "statements", "functions", "branches"])
    if (coverage.total[metric].pct < 70)
      throw new Error("Cobertura menor a 70%: " + metric);
  return {
    implemented: true,
    tests: report.numPassedTests,
    measuredFiles: measured.length,
    excluded: [
      "src/composition/server.ts: arranque fuera de instrumentación, smoke HTTP separado",
    ],
    coverage: coverage.total,
  };
}
