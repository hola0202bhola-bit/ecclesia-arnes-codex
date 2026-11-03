import { URLSearchParams } from "node:url";
import { createRequire } from "node:module";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { createServer } from "node:net";
import { randomBytes, randomUUID } from "node:crypto";
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
  // PostgreSQL 18 usa trabajadores de E/S por defecto. En Windows, el cierre
  // forzado del paquete embebido puede dejar uno con las tuberías heredadas.
  // E/S síncrona solo en este servidor temporal; no cambia la BD del producto.
  postgresFlags: [
    "-h",
    "127.0.0.1",
    ...(process.platform === "win32" ? ["-c", "io_method=sync"] : []),
  ],
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
  const { rows } = await client.query(
    "SELECT version() AS version, current_setting('io_method') AS io_method",
  );
  await client.end();
  console.log("PostgreSQL real aislado:", rows[0].version);
  await run(["node_modules/prisma/build/index.js", "migrate", "deploy"]);
  await run(["node_modules/tsx/dist/cli.mjs", "prisma/seed.ts"]);
  await run(["node_modules/tsx/dist/cli.mjs", "prisma/seed.ts"]);
  mkdirSync("evidence", { recursive: true });
  // Configuración del gate escrita por el arnés; no hereda exclusiones del proyecto.
  writeFileSync(
    "evidence/gate-vitest.config.mjs",
    `export default {test:{include:['tests/**/*.test.ts'],fileParallelism:false,bail:1,testTimeout:15000,hookTimeout:15000,coverage:{provider:'v8',include:['src/**/*.ts'],exclude:['src/composition/server.ts'],reporter:['text','json-summary','html'],thresholds:{lines:70,statements:70,functions:70,branches:70}}}};\n`,
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
    env: {
      ...env,
      JWT_SECRET: env.TEST_JWT_SECRET,
      PORT: String(httpPort),
      APP_ORIGIN: "http://127.0.0.1:" + httpPort,
    },
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
    const ranking = await fetch(
      `http://127.0.0.1:${httpPort}/api/v1/ranking-patrimonial`,
    );
    assert.equal(ranking.status, 200);
    assert.ok(Array.isArray((await ranking.json()).data));
    const rankingWeb = await fetch(
      `http://127.0.0.1:${httpPort}/ranking-patrimonial`,
    );
    assert.equal(rankingWeb.status, 200);
    assert.match(await rankingWeb.text(), /Iglesias reconocidas/);
    const iglesias = await (
      await fetch(`http://127.0.0.1:${httpPort}/api/v1/iglesias?estadoClave=21`)
    ).json();
    const iglesiaId = iglesias.data[0].id;
    const objetos = await fetch(
      `http://127.0.0.1:${httpPort}/api/v1/iglesias/${iglesiaId}/objetos`,
    );
    assert.equal(objetos.status, 200);
    assert.equal((await objetos.json()).calculo.criterioId, "caso-v1");
    const patrimonioPrivado = await fetch(
      `http://127.0.0.1:${httpPort}/personal/patrimonio/${iglesiaId}`,
    );
    assert.equal(patrimonioPrivado.status, 401);
    for (const clase of ["servicios", "platicas"]) {
      const oferta = await fetch(
        `http://127.0.0.1:${httpPort}/api/v1/iglesias/${iglesiaId}/${clase}`,
      );
      assert.equal(oferta.status, 200);
      assert.ok(Array.isArray((await oferta.json()).data));
      const pagina = await fetch(
        `http://127.0.0.1:${httpPort}/iglesias/${iglesiaId}/${clase}`,
      );
      assert.equal(pagina.status, 200);
      assert.match(await pagina.text(), /Ecclesia/);
      const gestionOferta = await fetch(
        `http://127.0.0.1:${httpPort}/personal/oferta/${iglesiaId}/${clase}`,
      );
      assert.equal(gestionOferta.status, 401);
    }
    const misas = await fetch(
      `http://127.0.0.1:${httpPort}/api/v1/iglesias/${iglesiaId}/misas?desde=2026-11-02`,
    );
    assert.equal(misas.status, 200);
    assert.ok(Array.isArray((await misas.json()).data));
    const misasWeb = await fetch(
      `http://127.0.0.1:${httpPort}/iglesias/${iglesiaId}/misas?desde=2026-11-02`,
    );
    assert.equal(misasWeb.status, 200);
    assert.match(await misasWeb.text(), /Misas previstas/);
    const agenda = await fetch(
      `http://127.0.0.1:${httpPort}/personal/agenda/${iglesiaId}`,
    );
    assert.equal(agenda.status, 401);
    // Flujo contable sobre servidor compilado y BD efímera, sin credenciales predeterminadas.
    const fixture = new pg.Client({ connectionString: env.DATABASE_URL });
    await fixture.connect();
    const actor = randomUUID(),
      treasury = randomUUID(),
      padre = randomUUID(),
      horario = randomUUID(),
      ocurrencia = randomUUID(),
      celebracion = randomUUID();
    const clave = randomBytes(24).toString("hex");
    const bcrypt = requireProject("bcryptjs");
    const hash = await bcrypt.hash(clave, 12);
    try {
      await fixture.query(
        'INSERT INTO "Usuario" (id,identificador,"passwordHash",rol,"iglesiaId") VALUES ($1,$2,$3,$4,$5),($6,$7,$3,$8,$5)',
        [
          actor,
          "smoke-admin-" + actor,
          hash,
          "ADMIN_IGLESIA",
          iglesiaId,
          treasury,
          "smoke-tesorero-" + treasury,
          "TESORERO",
        ],
      );
      await fixture.query(
        'INSERT INTO "Sacerdote" (id,nombre) VALUES ($1,$2)',
        [padre, "Padre ficticio smoke"],
      );
      await fixture.query('INSERT INTO "AsignacionSacerdote" VALUES ($1,$2)', [
        iglesiaId,
        padre,
      ]);
      await fixture.query('UPDATE "Iglesia" SET "zonaIana"=$1 WHERE id=$2', [
        "America/Mexico_City",
        iglesiaId,
      ]);
      await fixture.query(
        'INSERT INTO "HorarioMisa" (id,"iglesiaId","sacerdoteId","diaSemana","horaLocal",tipo,idioma,desde,hasta,"zonaIana") VALUES ($1,$2,$3,1,$4,$5,$6,$7,$7,$8)',
        [
          horario,
          iglesiaId,
          padre,
          "10:00",
          "DIARIA",
          "Español",
          "2026-10-05",
          "America/Mexico_City",
        ],
      );
      await fixture.query(
        'INSERT INTO "OcurrenciaMisa" (id,"horarioId","iglesiaId","sacerdoteId","fechaLocal","horaLocal","zonaIana",inicio,fin) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)',
        [
          ocurrencia,
          horario,
          iglesiaId,
          padre,
          "2026-10-05",
          "10:00",
          "America/Mexico_City",
          "2026-10-05T16:00:00Z",
          "2026-10-05T17:00:00Z",
        ],
      );
      await fixture.query(
        'INSERT INTO "CelebracionMisa" (id,"ocurrenciaId","iglesiaId","previstoId","oficianteId","fechaLocal","horaLocal","zonaIana",inicio,fin,"actorId") VALUES ($1,$2,$3,$4,$4,$5,$6,$7,$8,$9,$10)',
        [
          celebracion,
          ocurrencia,
          iglesiaId,
          padre,
          "2026-10-05",
          "10:00",
          "America/Mexico_City",
          "2026-10-05T16:00:00Z",
          "2026-10-05T17:00:00Z",
          actor,
        ],
      );
    } finally {
      await fixture.end();
    }
    const base = `http://127.0.0.1:${httpPort}`;
    const cuenta = await fetch(base + "/api/v1/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        identificador: "smoke-tesorero-" + treasury,
        password: clave,
      }),
    });
    assert.equal(cuenta.status, 200);
    const headers = {
      "Content-Type": "application/json",
      Authorization: "Bearer " + (await cuenta.json()).accessToken,
    };
    const recurso =
      base +
      "/api/v1/iglesias/" +
      iglesiaId +
      "/celebraciones/" +
      celebracion +
      "/diezmo";
    assert.equal(
      (
        await fetch(recurso, {
          method: "POST",
          headers,
          body: JSON.stringify({ importe: "0.10" }),
        })
      ).status,
      201,
    );
    assert.equal(
      (
        await fetch(recurso, {
          method: "POST",
          headers,
          body: JSON.stringify({ importe: "0.20" }),
        })
      ).status,
      409,
    );
    assert.equal(
      (
        await fetch(recurso, {
          method: "PUT",
          headers,
          body: JSON.stringify({ importe: "0.30", version: 1 }),
        })
      ).status,
      200,
    );
    assert.equal(
      (
        await fetch(recurso, {
          method: "PUT",
          headers,
          body: JSON.stringify({ importe: "0.40", version: 1 }),
        })
      ).status,
      409,
    );
    const reporteUrl =
      base +
      "/api/v1/iglesias/" +
      iglesiaId +
      "/reportes/diezmos?desde=2026-10-01&hasta=2026-10-31";
    assert.equal((await fetch(reporteUrl)).status, 401);
    const contable = await fetch(reporteUrl, { headers });
    assert.equal(contable.status, 200);
    assert.equal((await contable.json()).resumen.totalCentavos, "30");
    const auditoria = await fetch(recurso + "/correcciones", { headers });
    assert.equal(auditoria.status, 200);
    assert.equal((await auditoria.json()).data.length, 2);
    const paginaDiezmos =
      base +
      "/personal/diezmos/" +
      iglesiaId +
      "?desde=2026-10-01&hasta=2026-10-31";
    assert.equal((await fetch(paginaDiezmos)).status, 401);
    const contableWeb = await fetch(paginaDiezmos, { headers });
    assert.equal(contableWeb.status, 200);
    assert.match(await contableWeb.text(), /0.30/);
    // Flujo RF25–31 sobre servidor compilado. Credenciales efímeras solo en memoria.
    const adminLogin = await fetch(base + "/api/v1/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        identificador: "smoke-admin-" + actor,
        password: clave,
      }),
    });
    assert.equal(adminLogin.status, 200);
    const adminHeaders = {
      "Content-Type": "application/json",
      Authorization: "Bearer " + (await adminLogin.json()).accessToken,
    };
    const origin = base;
    const formulario = await fetch(base + "/api/v1/solicitudes/acceso");
    assert.equal(formulario.status, 200);
    const csrfVisitante = (await formulario.json()).csrf;
    const cookieVisitante = formulario.headers
      .getSetCookie()
      .map((v) => v.split(";")[0])
      .join("; ");
    const visitanteHeaders = {
      "Content-Type": "application/json",
      Cookie: cookieVisitante,
      Origin: origin,
      "X-CSRF-Token": csrfVisitante,
    };
    const ofertasUrl =
      base + "/api/v1/iglesias/" + iglesiaId + "/ofertas-espacio";
    assert.equal(
      (
        await fetch(ofertasUrl + "/NICHO", {
          method: "PUT",
          headers: adminHeaders,
          body: JSON.stringify({ activo: true, version: 0 }),
        })
      ).status,
      200,
    );
    const ofertasPublicas = await (await fetch(ofertasUrl)).json();
    assert.deepEqual(ofertasPublicas.data, [{ tipo: "NICHO" }]);
    const solicitudUrl =
      base + "/api/v1/iglesias/" + iglesiaId + "/solicitudes";
    const envio = await fetch(solicitudUrl, {
      method: "POST",
      headers: visitanteHeaders,
      body: JSON.stringify({
        tipo: "NICHO",
        nombre: "Solicitante ficticio smoke",
        contacto: "smoke@example.invalid",
        peticionId: randomUUID(),
      }),
    });
    assert.equal(envio.status, 201);
    const recibo = await envio.json();
    const seguimientoUrl = base + "/api/v1/solicitudes/" + recibo.folio;
    assert.equal((await fetch(seguimientoUrl)).status, 404);
    const seguimiento = await fetch(seguimientoUrl, {
      headers: { "X-Solicitud-Clave": recibo.clave },
    });
    assert.equal(seguimiento.status, 200);
    const seguimientoDatos = await seguimiento.json();
    assert.equal(seguimientoDatos.estado, "REGISTRADA");
    for (const campo of [
      "nombre",
      "contacto",
      "claveHash",
      "clave",
      "historial",
    ])
      assert.equal(campo in seguimientoDatos, false);
    const solicitudesPrivadas = await fetch(solicitudUrl, {
      headers: adminHeaders,
    });
    assert.equal(solicitudesPrivadas.status, 200);
    const solicitudId = (await solicitudesPrivadas.json()).data[0].id;
    const revision = await fetch(
      solicitudUrl + "/" + solicitudId + "/revision",
      {
        method: "POST",
        headers: adminHeaders,
        body: JSON.stringify({
          resultado: "COTIZAR",
          version: 1,
          precio: "0.10",
          condiciones: "Servicio individual ficticio, sin pago ni asignación",
        }),
      },
    );
    assert.equal(revision.status, 200);
    const cotizada = await revision.json();
    assert.equal(cotizada.cotizacion.precio, "0.10");
    assert.equal(
      new Date(cotizada.cotizacion.vence) -
        new Date(cotizada.cotizacion.emitida),
      15 * 86400000,
    );
    const seguimientoEjs = await fetch(base + "/solicitudes/seguimiento", {
      method: "POST",
      headers: {
        ...visitanteHeaders,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({ ...recibo, _csrf: csrfVisitante }),
    });
    assert.equal(seguimientoEjs.status, 200);
    assert.match(await seguimientoEjs.text(), /Aceptar cotización/);
    assert.equal(
      (
        await fetch(seguimientoUrl + "/aceptar", {
          method: "POST",
          headers: { ...visitanteHeaders, "X-Solicitud-Clave": recibo.clave },
          body: JSON.stringify({ version: 2 }),
        })
      ).status,
      200,
    );
    assert.equal(
      (
        await fetch(seguimientoUrl + "/cancelar", {
          method: "POST",
          headers: { ...visitanteHeaders, "X-Solicitud-Clave": recibo.clave },
          body: JSON.stringify({ version: 3 }),
        })
      ).status,
      409,
    );
    assert.equal(
      (await fetch(base + "/personal/solicitudes/" + iglesiaId)).status,
      401,
    );
    const espaciosEjs = await fetch(
      base + "/iglesias/" + iglesiaId + "/espacios",
    );
    assert.equal(espaciosEjs.status, 200);
    assert.match(await espaciosEjs.text(), /Solicitar sin cuenta/);
    console.log(
      "Smoke solicitudes compilado: oferta sin precio 200, alta sin cuenta 201, seguimiento inválido 404/válido 200, cotización exacta/vigencia 200, EJS 200, aceptación 200, cancelación aceptada 409, gestión anónima 401.",
    );
    console.log(
      "Smoke financiero compilado: captura 201, corrección 200, duplicado/versión 409, total exacto 30 centavos, historial y EJS privados 200, anónimo 401.",
    );
    console.log(
      "Smoke HTTP del servidor compilado: API/EJS/login/catálogos/patrimonio/ranking/misas 200; usuarios, gestión web/patrimonio/agenda y alta anónima 401.",
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
        ioMethod: rows[0].io_method,
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
          ranking: 200,
          rankingWeb: 200,
          patrimonio: 200,
          anonymousHeritageManagement: 401,
          servicios: 200,
          platicas: 200,
          anonymousOfferManagement: 401,
          misas: 200,
          misasWeb: 200,
          anonymousAgendaManagement: 401,
          diezmos: {
            alta: 201,
            correccion: 200,
            duplicado: 409,
            versionObsoleta: 409,
            totalCentavos: "30",
            historial: 200,
            web: 200,
            anonimo: 401,
          },
          solicitudes: {
            ofertaPublica: 200,
            alta: 201,
            seguimientoInvalido: 404,
            seguimientoValido: 200,
            cotizacion: 200,
            precio: "0.10",
            vigenciaHoras: 360,
            ejs: 200,
            aceptacion: 200,
            cancelarAceptada: 409,
            gestionAnonima: 401,
          },
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
  rmSync(temp, {
    recursive: true,
    force: true,
    maxRetries: 20,
    retryDelay: 250,
  });
  console.log("PostgreSQL temporal detenido y archivos de la base eliminados.");
}
