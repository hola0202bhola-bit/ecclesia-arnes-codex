import { spawn } from "node:child_process";
import { createServer } from "node:net";
import { once } from "node:events";
import { createRequire } from "node:module";
import { resolve } from "node:path";
import assert from "node:assert/strict";
import { randomUUID, randomBytes } from "node:crypto";

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
    const css = await fetch(base + "/assets/ecclesia.css");
    assert.equal(css.status, 200);
    assert.match(css.headers.get("content-type"), /text\/css/);
    assert.match(await css.text(), /focus-visible/);
    assert.match(r.headers.get("content-security-policy"), /style-src 'self'/);
    assert.ok(html.includes('aria-label="Navegación principal"'));
    // Usuario exclusivamente sintético en la segunda base efímera del gate.
    const testPassword = randomBytes(24).toString("hex");
    const { hash } = requireProject("bcryptjs");
    const client = new Client({ connectionString: env.ECCLESIA_DEMO_TEST_URL });
    await client.connect();
    try {
      await client.query(
        'INSERT INTO "Usuario" (id,identificador,"passwordHash",rol) VALUES ($1,$2,$3,$4)',
        [
          randomUUID(),
          "smoke-ui",
          await hash(testPassword, 12),
          "COORDINACION",
        ],
      );
      const tables = [
        "ObjetoPatrimonial",
        "ServicioOfrecido",
        "Platica",
        "HorarioMisa",
        "CelebracionMisa",
        "Diezmo",
        "SolicitudEspacio",
      ];
      const counts = async () => {
        const result = [];
        for (const table of tables)
          result.push(
            (
              await client.query(
                `SELECT count(*)::int AS n, md5(coalesce(jsonb_agg(to_jsonb(t) ORDER BY id)::text,'[]')) AS huella FROM "${table}" t`,
              )
            ).rows[0],
          );
        return result;
      };
      const antes = await counts();
      const login = await fetch(base + "/api/v1/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          identificador: "smoke-ui",
          password: testPassword,
        }),
      });
      assert.equal(login.status, 200);
      const { accessToken } = await login.json();
      const headers = {
        "Content-Type": "application/json",
        Authorization: "Bearer " + accessToken,
      };
      const send = (path, body) =>
        fetch(base + path, {
          method: "POST",
          headers,
          body: JSON.stringify(body),
        });
      const current = await (
        await fetch(base + "/api/v1/iglesias/" + iglesia)
      ).json();
      const cierre = await send(`/api/v1/iglesias/${iglesia}/cerrar`, {
        version: current.iglesia.version,
        motivo: "Cierre sintético del smoke",
      });
      assert.equal(cierre.status, 200);
      const cerrado = await cierre.json();
      for (const suffix of [
        "",
        "/patrimonio",
        "/servicios",
        "/platicas",
        "/misas",
        "/espacios",
      ])
        assert.equal(
          (await fetch(base + "/iglesias/" + iglesia + suffix)).status,
          404,
        );
      const privada = await fetch(
        base + `/personal/iglesias/${iglesia}/historial`,
        { headers },
      );
      assert.equal(privada.status, 200);
      assert.ok((await privada.text()).includes("Reabrir iglesia"));
      assert.deepEqual(await counts(), antes);
      assert.equal(
        (
          await send(`/api/v1/iglesias/${iglesia}/reabrir`, {
            version: cerrado.version,
            motivo: "Reapertura sintética del smoke",
          })
        ).status,
        200,
      );
      const estado = await (
        await fetch(base + "/api/v1/criterios-patrimoniales", { headers })
      ).json();
      const { id: _id, ...parametros } = estado.versiones.find(
        (v) => v.id === "caso-v1",
      ).parametros;
      void _id;
      parametros.bonoInahDecimas = 100;
      const creado = await send("/api/v1/criterios-patrimoniales", {
        nombre: "Revisión smoke",
        parametros,
        motivo: "Verificación sintética de criterios",
      });
      assert.equal(creado.status, 201);
      const version = await creado.json();
      assert.equal(
        (
          await send(`/api/v1/criterios-patrimoniales/${version.id}/activar`, {
            version: estado.activo.version,
            motivo: "Activación sintética del smoke",
          })
        ).status,
        200,
      );
      const indice = await (
        await fetch(base + `/api/v1/iglesias/${iglesia}/objetos`)
      ).json();
      assert.equal(indice.calculo.criterioId, version.id);
      const ranking = await (
        await fetch(base + "/api/v1/ranking-patrimonial")
      ).json();
      assert.ok(ranking.data.every((item) => item.criterioId === version.id));
      assert.deepEqual(await counts(), antes);
    } finally {
      await client.end();
    }
    console.log(
      "Smoke UI/RF04/RF11 compilado: CSS/CSP, cierre/reapertura e historial privado, exclusión pública de seis rutas, datos CT20 preservados y criterio activo en cálculo/ranking.",
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
