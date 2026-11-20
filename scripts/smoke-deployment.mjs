import { spawn } from "node:child_process";
import { createServer } from "node:net";
import { URLSearchParams } from "node:url";
import { once } from "node:events";
import { createRequire } from "node:module";
import { resolve } from "node:path";
import { randomBytes, randomUUID } from "node:crypto";
import assert from "node:assert/strict";

export async function smokeDeployment(env) {
  const requireProject = createRequire(resolve("package.json"));
  const { Client } = requireProject("pg");
  const { hash } = requireProject("bcryptjs");
  const ports = {};
  for (const surface of ["api", "front", "admin"]) {
    ports[surface] = await new Promise((ok, fail) => {
      const s = createServer();
      s.on("error", fail);
      s.listen(0, "127.0.0.1", () => {
        const p = s.address().port;
        s.close(() => ok(p));
      });
    });
  }
  const bases = Object.fromEntries(
    Object.entries(ports).map(([k, p]) => [k, `http://127.0.0.1:${p}`]),
  );
  const children = [];
  let visitorId;
  const client = new Client({ connectionString: env.DATABASE_URL });
  await client.connect();
  const id = randomUUID(),
    identificador = "deploy." + randomBytes(6).toString("hex"),
    password = randomBytes(24).toString("hex");
  try {
    await client.query(
      'INSERT INTO "Usuario" (id,identificador,"passwordHash",rol) VALUES ($1,$2,$3,$4)',
      [id, identificador, await hash(password, 12), "COORDINACION"],
    );
    const start = async (surface) => {
      const child = spawn(
        process.execPath,
        ["scripts/render-start.mjs", surface],
        {
          env: {
            ...env,
            NODE_ENV: "test",
            RENDER: "false",
            HOST: "0.0.0.0",
            PORT: String(ports[surface]),
            APP_ORIGIN: bases[surface],
            FRONT_ORIGIN: bases.front,
            ADMIN_ORIGIN: bases.admin,
            JWT_SECRET: env.TEST_JWT_SECRET,
            TRUST_PROXY_HOPS: "1",
          },
          windowsHide: true,
          stdio: ["ignore", "pipe", "pipe"],
        },
      );
      children.push(child);
      child.stderr.on("data", () => {});
      await new Promise((ok, fail) => {
        const timer = setTimeout(
          () => fail(new Error("Arranque separado excedió 20s: " + surface)),
          20000,
        );
        child.once("error", (e) => {
          clearTimeout(timer);
          fail(e);
        });
        child.once("exit", () => {
          clearTimeout(timer);
          fail(new Error("Arranque separado falló: " + surface));
        });
        child.stdout.on("data", (data) => {
          if (data.toString().includes("Ecclesia:")) {
            clearTimeout(timer);
            ok();
          }
        });
      });
      assert.equal((await fetch(bases[surface] + "/health/ready")).status, 200);
    };
    for (const surface of ["api", "front", "admin"]) await start(surface);
    assert.equal((await fetch(bases.api + "/iglesias")).status, 404);
    assert.equal((await fetch(bases.front + "/api/v1/iglesias")).status, 404);
    assert.equal((await fetch(bases.admin + "/api/v1/iglesias")).status, 404);
    assert.equal(
      (await fetch(bases.api + "/api/v1/iglesias?estadoClave=21")).status,
      401,
    );
    const mustLogin = await fetch(bases.front + "/iglesias", {
      redirect: "manual",
    });
    assert.equal(mustLogin.headers.get("location"), "/cuenta/login");
    const redirect = await fetch(
      bases.front + "/personal/login?clave=privada",
      { redirect: "manual" },
    );
    assert.equal(
      redirect.headers.get("location"),
      bases.admin + "/personal/login",
    );
    const login = await fetch(bases.admin + "/personal/login", {
      method: "POST",
      redirect: "manual",
      headers: {
        Origin: bases.admin,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({ identificador, password }),
    });
    assert.equal(login.status, 303);
    const cookie = login.headers.get("set-cookie").split(";")[0];
    assert.equal(
      (await fetch(bases.admin + "/personal", { headers: { Cookie: cookie } }))
        .status,
      200,
    );
    const token = cookie.slice("ecclesia_session=".length);
    assert.equal(
      (
        await fetch(bases.api + "/api/v1/iglesias?estadoClave=21", {
          headers: { Authorization: "Bearer " + token },
        })
      ).status,
      200,
    );
    assert.equal(
      (
        await fetch(bases.front + "/iglesias", {
          headers: { Authorization: "Bearer " + token },
        })
      ).status,
      200,
    );
    const me = await fetch(bases.api + "/api/v1/auth/me", {
      headers: { Authorization: "Bearer " + token },
    });
    assert.equal(me.status, 200);
    const { csrfToken } = await me.json();
    assert.equal(
      (
        await fetch(bases.admin + "/personal/logout", {
          method: "POST",
          redirect: "manual",
          headers: {
            Origin: bases.admin,
            Cookie: cookie,
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: new URLSearchParams({ _csrf: csrfToken }),
        })
      ).status,
      303,
    );
    assert.equal(
      (
        await fetch(bases.api + "/api/v1/auth/me", {
          headers: { Authorization: "Bearer " + token },
        })
      ).status,
      401,
    );
    const visitorName = "visitante." + randomBytes(6).toString("hex");
    const visitorPassword = randomBytes(24).toString("hex");
    const register = await fetch(bases.api + "/api/v1/auth/registro", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        identificador: visitorName,
        password: visitorPassword,
      }),
    });
    assert.equal(register.status, 201);
    const visitor = await register.json();
    assert.equal(visitor.rol, "VISITANTE");
    visitorId = visitor.id;
    const entry = await fetch(bases.front + "/cuenta/login");
    const entryHtml = await entry.text();
    const nonce = entryHtml.match(/name="_csrf" value="([^"]+)"/)[1];
    const entryCookie = entry.headers.get("set-cookie").split(";")[0];
    const entered = await fetch(bases.front + "/cuenta/login", {
      method: "POST",
      redirect: "manual",
      headers: {
        Origin: bases.front,
        Cookie: entryCookie,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        identificador: visitorName,
        password: visitorPassword,
        _csrf: nonce,
      }),
    });
    assert.equal(entered.status, 303);
    const visitorCookie = entered.headers.get("set-cookie").split(";")[0];
    const profile = await fetch(bases.front + "/cuenta/perfil", {
      headers: { Cookie: visitorCookie },
    });
    assert.equal(profile.status, 200);
    const profileHtml = await profile.text();
    const visitorCsrf = profileHtml.match(/name="_csrf" value="([^"]+)"/)[1];
    const edited = await fetch(bases.front + "/cuenta/perfil", {
      method: "POST",
      redirect: "manual",
      headers: {
        Origin: bases.front,
        Cookie: visitorCookie,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        _csrf: visitorCsrf,
        version: "0",
        nombreVisible: "Visitante del smoke",
        presentacion: "Perfil sintético persistido",
        avatar: "rama",
      }),
    });
    assert.equal(edited.status, 303);
    assert.equal(
      (
        await fetch(bases.admin + "/personal", {
          headers: { Cookie: visitorCookie },
        })
      ).status,
      403,
    );
    assert.equal(
      (
        await fetch(bases.admin + "/cuenta/perfil", {
          headers: { Cookie: visitorCookie },
        })
      ).status,
      403,
    );
    const front = children.splice(1, 1)[0];
    const stopped = once(front, "exit");
    front.kill();
    await stopped;
    await start("front");
    const restored = await fetch(bases.front + "/cuenta/perfil", {
      headers: { Cookie: visitorCookie },
    });
    assert.equal(restored.status, 200);
    assert.match(await restored.text(), /Visitante del smoke/);
    console.log(
      "Smoke cuentas 1.1: registro VISITANTE, login front, perfil propio, admin 403 y reinicio persistente aprobados.",
    );
    return {
      processes: 3,
      wildcardBind: true,
      readiness: true,
      routeIsolation: true,
      sessionAndRevocationAcrossProcesses: true,
      visitorRegistrationAndProfile: true,
      visitorDeniedAdmin: true,
      profileAndSessionSurviveFrontRestart: true,
      remoteDeployment: false,
    };
  } finally {
    for (const child of children.reverse()) {
      if (child.exitCode === null) {
        const stopped = once(child, "exit");
        child.kill();
        await stopped;
      }
    }
    await client.query('DELETE FROM "Usuario" WHERE id=$1', [id]);
    if (visitorId)
      await client.query('DELETE FROM "Usuario" WHERE id=$1', [visitorId]);
    await client.end();
  }
}
