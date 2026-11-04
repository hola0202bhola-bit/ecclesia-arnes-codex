import { spawn } from "node:child_process";
import { createServer } from "node:net";
import { once } from "node:events";
import { createRequire } from "node:module";
import { resolve } from "node:path";
import assert from "node:assert/strict";

export async function smokeDemo(env) {
  const requireProject = createRequire(resolve("package.json"));
  const { Client } = requireProject("pg");
  const c = new Client({ connectionString: env.ECCLESIA_DEMO_TEST_URL });
  let iglesia;
  await c.connect();
  try {
    const { rows } = await c.query(
      'SELECT id FROM "Iglesia" WHERE nombre LIKE $1 ORDER BY nombre LIMIT 1',
      ["CT20 Iglesia%"],
    );
    assert.equal(rows.length, 1);
    iglesia = rows[0].id;
    assert.equal(
      Number((await c.query('SELECT count(*) AS n FROM "Iglesia"')).rows[0].n),
      40,
    );
  } finally {
    await c.end();
  }
  const port = await new Promise((ok, fail) => {
    const s = createServer();
    s.on("error", fail);
    s.listen(0, "127.0.0.1", () => {
      const p = s.address().port;
      s.close(() => ok(p));
    });
  });
  const base = `http://127.0.0.1:${port}`;
  const web = spawn(process.execPath, ["dist/composition/server.js"], {
    env: {
      ...env,
      DATABASE_URL: env.ECCLESIA_DEMO_TEST_URL,
      JWT_SECRET: env.TEST_JWT_SECRET,
      APP_ORIGIN: base,
      PORT: String(port),
    },
    stdio: ["ignore", "pipe", "pipe"],
    windowsHide: true,
  });
  try {
    await new Promise((ok, fail) => {
      const timer = setTimeout(
        () => fail(new Error("Servidor demo no inició en 10s")),
        10000,
      );
      web.once("error", (e) => {
        clearTimeout(timer);
        fail(e);
      });
      web.once("exit", () => {
        clearTimeout(timer);
        fail(new Error("Servidor demo terminó antes de smoke"));
      });
      web.stdout.on("data", (d) => {
        if (d.toString().includes("Referencia local:")) {
          clearTimeout(timer);
          ok();
        }
      });
    });
    const r = await fetch(base + "/iglesias/" + iglesia);
    assert.equal(r.status, 200);
    const html = await r.text();
    for (const value of [
      "Patrimonio e índice",
      "Bautizo",
      "Matrimonio",
      "Pláticas",
      "Próximas misas y sacerdotes",
      "Espacios funerarios",
    ])
      assert.ok(html.includes(value));
    assert.ok(!html.includes("solicitante1@example.invalid"));
    assert.ok(!html.includes("Cotización ficticia"));
    assert.equal(
      (
        await fetch(
          base +
            "/api/v1/iglesias/" +
            iglesia +
            "/reportes/diezmos?desde=2026-10-05&hasta=2026-11-01",
        )
      ).status,
      401,
    );
    console.log(
      "Smoke CT20 compilado: 40 iglesias, ficha integrada EJS 200 con relaciones públicas, sin contacto/cotización de solicitud, reportes anónimos 401.",
    );
    return { iglesias: 40, fichaIntegrada: 200, reportesAnonimos: 401 };
  } finally {
    if (web.exitCode === null) {
      const fin = once(web, "exit");
      web.kill();
      await fin;
    }
  }
}
