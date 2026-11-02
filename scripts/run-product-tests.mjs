import { createRequire } from "node:module";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { createServer } from "node:net";
import { randomBytes } from "node:crypto";
import { spawn } from "node:child_process";
import { once } from "node:events";
import assert from "node:assert/strict";
const requireProject = createRequire(resolve("package.json"));
const EmbeddedPostgres = requireProject("embedded-postgres").default;
const pg = requireProject("pg");

// Siempre crea su propia BD; ignora DATABASE_URL del usuario.
const temp = mkdtempSync(join(tmpdir(), "ecclesia-pg-test-"));
const port = await new Promise((resolve, reject) => {
  const server = createServer();
  server.on("error", reject);
  server.listen(0, "127.0.0.1", () => {
    const address = server.address();
    server.close(() => resolve(address.port));
  });
});
const password = randomBytes(32).toString("hex");
const cluster = new EmbeddedPostgres({
  databaseDir: join(temp, "db"),
  user: "ecclesia_test",
  password,
  port,
  persistent: true,
  authMethod: "scram-sha-256",
  initdbFlags: ["--encoding=UTF8", "--locale=C"],
  postgresFlags: ["-h", "127.0.0.1"],
  onLog: () => {},
  onError: () => {},
  autoRehydrateSymlinks: true,
});
const env = {
  ...process.env,
  DATABASE_URL: `postgresql://ecclesia_test:${password}@127.0.0.1:${port}/ecclesia_test`,
  TEST_JWT_SECRET: randomBytes(48).toString("hex"),
  NO_COLOR: "1",
};
delete env.NODE_TEST_CONTEXT;
async function run(args) {
  const code = await new Promise((resolve, reject) => {
    const child = spawn(process.execPath, args, {
      env,
      stdio: "inherit",
      windowsHide: true,
    });
    child.on("error", reject);
    child.on("exit", resolve);
  });
  if (code !== 0)
    throw new Error(
      `Comprobación de producto falló: ${args[0]} (salida ${code})`,
    );
}
let started = false;
try {
  await cluster.initialise();
  await cluster.start();
  started = true;
  await cluster.createDatabase("ecclesia_test");
  const client = new pg.Client({ connectionString: env.DATABASE_URL });
  await client.connect();
  const { rows } = await client.query("SELECT version() AS version");
  await client.end();
  console.log("PostgreSQL real aislado:", rows[0].version);
  await run(["node_modules/prisma/build/index.js", "migrate", "deploy"]);
  await run(["node_modules/tsx/dist/cli.mjs", "prisma/seed.ts"]);
  await run(["node_modules/tsx/dist/cli.mjs", "prisma/seed.ts"]);
  mkdirSync("evidence", { recursive: true });
  // Configuración del gate escrita por el arnés; no hereda exclusiones del proyecto.
  writeFileSync(
    "evidence/gate-vitest.config.mjs",
    `export default {test:{include:['tests/**/*.test.ts'],fileParallelism:false,testTimeout:15000,hookTimeout:15000,coverage:{provider:'v8',include:['src/**/*.ts'],exclude:['src/composition/server.ts'],reporter:['text','json-summary','html'],thresholds:{lines:70,statements:70,functions:70,branches:70}}}};\n`,
  );
  await run([
    "node_modules/vitest/vitest.mjs",
    "run",
    "--config",
    "evidence/gate-vitest.config.mjs",
    "--coverage",
    "--reporter=default",
    "--reporter=json",
    "--outputFile.json=evidence/vitest.json",
  ]);
  const httpPort = await new Promise((resolve, reject) => {
    const server = createServer();
    server.on("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      server.close(() => resolve(address.port));
    });
  });
  const web = spawn(process.execPath, ["dist/composition/server.js"], {
    env: { ...env, JWT_SECRET: env.TEST_JWT_SECRET, PORT: String(httpPort) },
    stdio: ["ignore", "pipe", "pipe"],
    windowsHide: true,
  });
  try {
    await new Promise((resolve, reject) => {
      const timer = setTimeout(
        () =>
          reject(
            new Error("Servidor compilado no inició en 10s (smoke local)"),
          ),
        10000,
      );
      web.on("error", (error) => {
        clearTimeout(timer);
        reject(error);
      });
      web.once("exit", () => {
        clearTimeout(timer);
        reject(new Error("Servidor terminó antes de smoke HTTP"));
      });
      web.stdout.on("data", (data) => {
        if (data.toString().includes("Referencia local:")) {
          clearTimeout(timer);
          resolve();
        }
      });
    });
    const api = await fetch(
      `http://127.0.0.1:${httpPort}/api/v1/iglesias?estadoClave=21`,
    );
    assert.equal(api.status, 200);
    assert.ok(Array.isArray((await api.json()).data));
    const html = await fetch(
      `http://127.0.0.1:${httpPort}/iglesias?estadoClave=21`,
    );
    assert.equal(html.status, 200);
    assert.match(await html.text(), /Ecclesia/);
    const login = await fetch(`http://127.0.0.1:${httpPort}/personal/login`);
    assert.equal(login.status, 200);
    assert.match(await login.text(), /Acceso del personal/);
    const privado = await fetch(`http://127.0.0.1:${httpPort}/api/v1/usuarios`);
    assert.equal(privado.status, 401);
    const estados = await fetch(
      `http://127.0.0.1:${httpPort}/api/v1/catalogos/estados?pageSize=100`,
    );
    assert.equal(estados.status, 200);
    assert.equal((await estados.json()).meta.total, 32);
    const municipios = await fetch(
      `http://127.0.0.1:${httpPort}/api/v1/catalogos/municipios?estadoClave=21`,
    );
    assert.equal(municipios.status, 200);
    assert.equal((await municipios.json()).meta.total, 217);
    const gestion = await fetch(
      `http://127.0.0.1:${httpPort}/personal/iglesias`,
    );
    assert.equal(gestion.status, 401);
    assert.match(await gestion.text(), /Iniciar sesión/);
    const denied = await fetch(`http://127.0.0.1:${httpPort}/api/v1/iglesias`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{}",
    });
    assert.equal(denied.status, 401);
    console.log(
      "Smoke HTTP del servidor compilado: API/EJS/login/catálogos 200; usuarios, gestión web y alta anónima 401.",
    );
  } finally {
    if (web.exitCode === null) {
      const stopped = once(web, "exit");
      web.kill();
      await stopped;
    }
  }
  writeFileSync(
    "evidence/database.json",
    JSON.stringify(
      {
        date: new Date().toISOString(),
        database: rows[0].version,
        migrations: "prisma migrate deploy",
        seedRuns: 2,
        isolated: true,
        externalDatabaseUsed: false,
        compiledServerSmoke: {
          api: 200,
          ejs: 200,
          anonymousWrite: 401,
          loginPage: 200,
          anonymousUsers: 401,
          anonymousChurchManagement: 401,
          states: 32,
          pueblaMunicipalities: 217,
          browserOrMobileTest: false,
        },
      },
      null,
      2,
    ),
  );
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
} finally {
  if (started) await cluster.stop();
  // Ruta generada por mkdtemp, nunca un destino proporcionado por el usuario.
  rmSync(temp, { recursive: true, force: true });
}
