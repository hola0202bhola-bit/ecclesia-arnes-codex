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
    for (const surface of ["api", "front", "admin"]) {
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
    }
    assert.equal((await fetch(bases.api + "/iglesias")).status, 404);
    assert.equal((await fetch(bases.front + "/api/v1/iglesias")).status, 404);
    assert.equal((await fetch(bases.admin + "/api/v1/iglesias")).status, 404);
    assert.equal(
      (await fetch(bases.api + "/api/v1/iglesias?estadoClave=21")).status,
      200,
    );
    assert.equal((await fetch(bases.front + "/iglesias")).status, 200);
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
    return {
      processes: 3,
      wildcardBind: true,
      readiness: true,
      routeIsolation: true,
      sessionAndRevocationAcrossProcesses: true,
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
    await client.end();
  }
}
