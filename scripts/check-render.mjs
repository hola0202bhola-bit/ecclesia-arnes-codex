import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import assert from "node:assert/strict";

// JSON es subconjunto de YAML 1.2, igual que el contrato OpenAPI del producto.
export function validateRenderBlueprint(blueprint) {
  assert.deepEqual(Object.keys(blueprint), ["services"]);
  assert.equal(blueprint.services.length, 3);
  for (const [i, surface] of ["api", "front", "admin"].entries()) {
    const service = blueprint.services[i];
    assert.equal(service.name, "ecclesia-" + surface);
    assert.equal(service.type, "web");
    assert.equal(service.runtime, "node");
    assert.equal(service.plan, "free");
    assert.equal(service.autoDeployTrigger, "off");
    assert.equal(
      service.buildCommand,
      "npm ci --include=dev && npm run generate && npm run build",
    );
    assert.equal(
      service.startCommand,
      "node scripts/render-start.mjs " + surface,
    );
    assert.equal(service.healthCheckPath, "/health/ready");
    assert.equal(service.preDeployCommand, undefined);
    const vars = Object.fromEntries(
      service.envVars.map(({ key, ...value }) => [key, value]),
    );
    assert.equal(service.envVars.length, Object.keys(vars).length);
    assert.deepEqual(vars.NODE_VERSION, { value: "24" });
    assert.deepEqual(vars.NODE_ENV, { value: "production" });
    assert.deepEqual(vars.APP_SURFACE, { value: surface });
    assert.deepEqual(vars.TRUST_PROXY_HOPS, { value: "1" });
    assert.deepEqual(vars.DATABASE_URL, { sync: false });
    assert.deepEqual(vars.JWT_SECRET, { sync: false });
    if (surface === "front")
      assert.deepEqual(vars.ADMIN_ORIGIN, { sync: false });
    if (surface === "admin")
      assert.deepEqual(vars.FRONT_ORIGIN, { sync: false });
  }
  return { services: 3, deploymentExecuted: false };
}
export function checkRender(project) {
  return validateRenderBlueprint(
    JSON.parse(readFileSync(resolve(project, "render.yaml"), "utf8")),
  );
}
